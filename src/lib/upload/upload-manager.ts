import * as api from "$lib/api/client";
import type { Session, StatusResponse } from "$lib/api/types";
import { MAX_PART_BYTES, PART_TARGET_SEC } from "$lib/audio/constants";
import * as storage from "$lib/audio/storage";
import { notifyActaReady } from "$lib/background/notifications";

export type UploadEvent =
  | { type: "part_uploading"; partIndex: number; progress: number }
  | { type: "part_done"; partIndex: number }
  | { type: "finalizing" }
  | { type: "processing"; status: StatusResponse; sessionTitle: string }
  | { type: "done"; downloadUrl: string; sessionTitle: string }
  | { type: "error"; message: string };

type Listener = (event: UploadEvent) => void;

export class UploadManager {
  private listeners: Listener[] = [];
  private uploading = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollingProcessId: string | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(event: UploadEvent) {
    this.listeners.forEach((l) => l(event));
  }

  shouldFlushPart(session: Session): boolean {
    const elapsed = session.durationSec - session.lastPartUploadedAtSec;
    const durationReady = elapsed >= PART_TARGET_SEC;
    const sizeReady = session.partBytesPending >= MAX_PART_BYTES * 0.9;
    return durationReady || sizeReady;
  }

  async onMicroChunk(session: Session, blob: Blob): Promise<Session> {
    await storage.saveMicroChunk(session.id, blob);
    session.partBytesPending += blob.size;
    await storage.saveSession(session);

    if (this.shouldFlushPart(session)) {
      return this.flushPart(session);
    }
    return session;
  }

  async flushPart(session: Session): Promise<Session> {
    if (this.uploading) return session;

    const chunks = await storage.getUnuploadedChunks(session.id);
    if (chunks.length === 0) return session;

    const blob = new Blob(
      chunks.map((c) => c.blob),
      { type: "audio/webm" },
    );
    if (blob.size === 0) return session;

    this.uploading = true;
    session.status = "uploading";
    await storage.saveSession(session);

    const partIndex = session.nextPartIndex;

    try {
      await api.uploadPart(
        session.serverSessionId,
        partIndex,
        blob,
        (progress) => {
          this.emit({ type: "part_uploading", partIndex, progress });
        },
      );

      await storage.markChunksUploaded(
        session.id,
        chunks.map((c) => c.index),
      );
      await storage.deleteUploadedChunks(session.id);

      session.nextPartIndex += 1;
      session.partBytesPending = 0;
      session.lastPartUploadedAtSec = session.durationSec;
      session.status = "recording";
      await storage.saveSession(session);
      this.emit({ type: "part_done", partIndex });
    } catch (err) {
      session.status = "failed";
      await storage.saveSession(session);
      const message =
        err instanceof Error ? err.message : "No se pudo enviar la visita";
      this.emit({ type: "error", message });
    } finally {
      this.uploading = false;
    }

    return session;
  }

  async retryPending(session: Session): Promise<Session> {
    session.status = "recording";
    await storage.saveSession(session);
    return this.flushPart(session);
  }

  async finalize(session: Session): Promise<Session> {
    session.status = "finalizing";
    await storage.saveSession(session);
    this.emit({ type: "finalizing" });

    let current = session;
    while ((await storage.countPendingChunks(current.id)) > 0) {
      current = await this.flushPart(current);
      if (current.status === "failed") return current;
    }

    try {
      const result = await api.finalizeSession(current.serverSessionId);
      const processId =
        result.process_id ?? result.id ?? current.serverSessionId;
      current.processId = processId;
      current.status = "processing";
      await storage.saveSession(current);
      this.startPolling(current);
    } catch (err) {
      current.status = "failed";
      await storage.saveSession(current);
      const message =
        err instanceof Error ? err.message : "No se pudo finalizar la visita";
      this.emit({ type: "error", message });
    }

    return current;
  }

  /** Comprueba el estado en servidor sin depender de que la app esté abierta. */
  async syncProcessingSession(session: Session): Promise<Session | null> {
    if (!session.processId) return session;

    try {
      const status = await api.getStatus(session.processId);

      if (status.status === "done" && status.download_url) {
        await this.markCompleted(session, status.download_url);
        return null;
      }

      if (status.status === "failed") {
        session.status = "failed";
        await storage.saveSession(session);
        this.emit({
          type: "error",
          message: status.error ?? "Error al crear el acta",
        });
        return session;
      }

      session.status = "processing";
      await storage.saveSession(session);
      this.emit({ type: "processing", status, sessionTitle: session.title });
      return session;
    } catch {
      return session;
    }
  }

  /** Al volver a la app: reanuda envíos interrumpidos y el seguimiento del acta. */
  async resumeAllBackgroundWork(): Promise<void> {
    const interrupted = await storage.getInterruptedSessions();
    for (const session of interrupted) {
      await this.finalize(session);
    }

    const processing = await storage.getProcessingSessions();
    for (const session of processing) {
      const updated = await this.syncProcessingSession(session);
      if (updated?.processId && updated.status === "processing") {
        this.startPolling(updated);
      }
    }
  }

  resumePolling(session: Session): void {
    if (session.processId && session.status === "processing") {
      this.startPolling(session);
    }
  }

  private async markCompleted(
    session: Session,
    downloadUrl: string,
  ): Promise<void> {
    await storage.saveCompletedActa({
      processId: session.processId!,
      title: session.title,
      completedAt: Date.now(),
      downloadUrl,
    });
    await storage.deleteSession(session.id);
    this.stopPolling();

    const hidden =
      typeof document !== "undefined" && document.visibilityState === "hidden";
    if (hidden) {
      await notifyActaReady(session.title);
    }

    this.emit({
      type: "done",
      downloadUrl,
      sessionTitle: session.title,
    });
  }

  private startPolling(session: Session): void {
    if (!session.processId) return;

    if (this.pollingProcessId === session.processId && this.pollTimer) {
      return;
    }

    this.stopPolling();
    this.pollingProcessId = session.processId;
    let attempts = 0;

    const poll = async () => {
      try {
        const status = await api.getStatus(session.processId!);
        this.emit({
          type: "processing",
          status,
          sessionTitle: session.title,
        });

        if (status.status === "done" && status.download_url) {
          await this.markCompleted(session, status.download_url);
          return;
        }

        if (status.status === "failed") {
          session.status = "failed";
          await storage.saveSession(session);
          this.stopPolling();
          this.emit({
            type: "error",
            message: status.error ?? "Error al crear el acta",
          });
          return;
        }

        attempts++;
        const delay = attempts < 6 ? 5000 : attempts < 20 ? 15000 : 30000;
        this.pollTimer = setTimeout(poll, delay);
      } catch {
        attempts++;
        const delay = Math.min(30000, 5000 * attempts);
        this.pollTimer = setTimeout(poll, delay);
      }
    };

    poll();
  }

  stopPolling(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
    this.pollingProcessId = null;
  }
}

export const uploadManager = new UploadManager();
