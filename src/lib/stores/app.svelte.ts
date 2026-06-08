import * as api from "$lib/api/client";
import type { AppTab, CompletedActa, Session } from "$lib/api/types";
import { notifyActaReady, requestNotificationPermission } from "$lib/background/notifications";
import { AudioRecorder } from "$lib/audio/recorder";
import * as storage from "$lib/audio/storage";
import { uploadManager } from "$lib/upload/upload-manager";

function createAppState() {
  let isLoggedIn = $state(false);
  let checkingSession = $state(true);
  let activeTab = $state<AppTab>("grabar");
  let isRecording = $state(false);
  let durationSec = $state(0);
  let currentSession = $state<Session | null>(null);
  let pendingSessions = $state<Session[]>([]);
  let processingSessions = $state<Session[]>([]);
  let actas = $state<CompletedActa[]>([]);
  let error = $state<string | null>(null);
  let statusMessage = $state<string | null>(null);
  let uploadProgress = $state(0);
  let processingPct = $state(0);
  let partsUploaded = $state(0);
  let isBusy = $state(false);

  const recorder = new AudioRecorder();
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  uploadManager.subscribe((event) => {
    switch (event.type) {
      case "part_uploading":
        statusMessage = `Enviando registro… (${event.progress}%)`;
        uploadProgress = event.progress;
        break;
      case "part_done":
        partsUploaded = event.partIndex + 1;
        statusMessage = null;
        uploadProgress = 0;
        break;
      case "finalizing":
        statusMessage = "Enviando los últimos minutos…";
        isBusy = true;
        break;
      case "processing":
        processingPct = event.status.progress_pct ?? 0;
        statusMessage = `Preparando el acta… ${processingPct}%`;
        isBusy = true;
        break;
      case "done":
        statusMessage = null;
        isBusy = false;
        currentSession = null;
        isRecording = false;
        durationSec = 0;
        notifyActaReady(event.sessionTitle);
        loadActas();
        loadPending();
        loadProcessing();
        activeTab = "actas";
        break;
      case "error":
        error = event.message === "UNAUTHORIZED"
          ? "Sesión expirada. Vuelve a iniciar sesión."
          : friendlyError(event.message);
        if (event.message === "UNAUTHORIZED") isLoggedIn = false;
        isBusy = false;
        loadPending();
        loadProcessing();
        break;
    }
  });

  function friendlyError(msg: string): string {
    if (msg.includes("red") || msg.includes("network")) {
      return "Sin conexión. Comprueba el WiFi e inténtalo de nuevo.";
    }
    return msg || "Algo salió mal. Inténtalo de nuevo.";
  }

  async function init() {
    checkingSession = true;
    isLoggedIn = await api.checkAuth();
    checkingSession = false;
    if (isLoggedIn) {
      await requestNotificationPermission();
      await loadPending();
      await loadProcessing();
      await loadActas();
      await recoverSession();
      await uploadManager.resumeAllBackgroundWork();
      await loadPending();
      await loadProcessing();
      await loadActas();
    }
  }

  async function onAppVisible() {
    if (!isLoggedIn) return;
    await uploadManager.resumeAllBackgroundWork();
    await loadPending();
    await loadProcessing();
    await loadActas();
    updateProcessingUI();
  }

  function updateProcessingUI() {
    if (processingSessions.length > 0 && !isRecording) {
      const s = processingSessions[0];
      currentSession = s;
      isBusy = true;
      statusMessage = "Preparando el acta…";
    } else if (!isRecording && !isBusy) {
      if (currentSession?.status === "processing") {
        currentSession = null;
      }
    }
  }

  async function loadPending() {
    pendingSessions = await storage.getActiveSessions();
  }

  async function loadProcessing() {
    processingSessions = await storage.getProcessingSessions();
    updateProcessingUI();
  }

  async function loadActas() {
    actas = await storage.getCompletedActas();
  }

  async function recoverSession() {
    const sessions = await storage.getActiveSessions();
    const interrupted = sessions.find(
      (s) => s.status === "recording" && !isRecording,
    );
    if (interrupted) {
      currentSession = interrupted;
      durationSec = interrupted.durationSec;
    }

    const processing = await storage.getProcessingSessions();
    if (processing.length > 0) {
      processingSessions = processing;
      currentSession = processing[0];
      isBusy = true;
      statusMessage = "Preparando el acta…";
    }
  }

  async function login(username: string, password: string) {
    error = null;
    await api.login(username, password);
    isLoggedIn = true;
    await requestNotificationPermission();
    await loadPending();
    await loadActas();
  }

  async function startVisit() {
    error = null;
    statusMessage = null;
    isBusy = true;

    try {
      const filename = storage.createFilename();
      const { id: serverSessionId } = await api.createSession(filename);
      const session: Session = {
        id: crypto.randomUUID(),
        serverSessionId,
        title: storage.createSessionTitle(),
        durationSec: 0,
        nextPartIndex: 0,
        partBytesPending: 0,
        lastPartUploadedAtSec: 0,
        status: "recording",
        createdAt: Date.now(),
      };
      await storage.saveSession(session);
      currentSession = session;
      isRecording = true;
      durationSec = 0;
      partsUploaded = 0;

      await recorder.start(async (blob) => {
        if (!currentSession || !isRecording) return;
        currentSession = await uploadManager.onMicroChunk(currentSession, blob);
        if (currentSession.status === "failed") {
          currentSession.status = "recording";
          await storage.saveSession(currentSession);
        }
        durationSec = currentSession.durationSec;
      });

      timerInterval = setInterval(() => {
        if (isRecording) durationSec += 1;
      }, 1000);
    } catch (err) {
      error = friendlyError(
        err instanceof Error ? err.message : "No se pudo empezar la visita",
      );
      isRecording = false;
      currentSession = null;
    } finally {
      isBusy = false;
    }
  }

  async function stopVisit() {
    if (!currentSession) return;
    isBusy = true;
    recorder.stop();
    isRecording = false;
    if (timerInterval) clearInterval(timerInterval);

    try {
      currentSession.status = "uploading";
      await storage.saveSession(currentSession);
      currentSession = await uploadManager.finalize(currentSession);
      await loadProcessing();
    } catch (err) {
      error = friendlyError(
        err instanceof Error ? err.message : "Error al terminar la visita",
      );
    } finally {
      if (currentSession?.status !== "processing") isBusy = false;
      await loadPending();
    }
  }

  async function sendInterrupted(session: Session) {
    error = null;
    isBusy = true;
    currentSession = session;
    try {
      currentSession = await uploadManager.finalize(session);
      await loadProcessing();
    } catch (err) {
      error = friendlyError(
        err instanceof Error ? err.message : "Error al enviar la visita",
      );
    } finally {
      if (currentSession?.status !== "processing") isBusy = false;
      await loadPending();
    }
  }

  async function retrySession(session: Session) {
    error = null;
    isBusy = true;
    currentSession = session;
    try {
      currentSession = await uploadManager.retryPending(session);
      if (currentSession.status !== "failed") {
        currentSession = await uploadManager.finalize(currentSession);
        await loadProcessing();
      }
    } catch (err) {
      error = friendlyError(
        err instanceof Error ? err.message : "Error al reintentar",
      );
    } finally {
      isBusy = false;
      await loadPending();
    }
  }

  async function discardSession(session: Session) {
    await storage.deleteSession(session.id);
    if (currentSession?.id === session.id) currentSession = null;
    await loadPending();
  }

  async function downloadActa(acta: CompletedActa) {
    try {
      const blob = await api.downloadFile(acta.downloadUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = acta.filename ?? `${acta.title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      error = "No se pudo descargar el acta. Comprueba tu conexión.";
    }
  }

  async function removeActa(acta: CompletedActa) {
    await storage.deleteCompletedActa(acta.processId);
    await loadActas();
  }

  function logout() {
    uploadManager.stopPolling();
    recorder.releaseMic();
    api.logoutApi();
    isLoggedIn = false;
    currentSession = null;
    isRecording = false;
    processingSessions = [];
  }

  return {
    get isLoggedIn() { return isLoggedIn; },
    get checkingSession() { return checkingSession; },
    get activeTab() { return activeTab; },
    set activeTab(v: AppTab) { activeTab = v; },
    get isRecording() { return isRecording; },
    get durationSec() { return durationSec; },
    get currentSession() { return currentSession; },
    get pendingSessions() { return pendingSessions; },
    get processingSessions() { return processingSessions; },
    get actas() { return actas; },
    get error() { return error; },
    set error(v: string | null) { error = v; },
    get statusMessage() { return statusMessage; },
    get uploadProgress() { return uploadProgress; },
    get processingPct() { return processingPct; },
    get partsUploaded() { return partsUploaded; },
    get isBusy() { return isBusy; },
    init,
    onAppVisible,
    login,
    startVisit,
    stopVisit,
    sendInterrupted,
    retrySession,
    discardSession,
    downloadActa,
    removeActa,
    logout,
    loadPending,
  };
}

export const app = createAppState();
