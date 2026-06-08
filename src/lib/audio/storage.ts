import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CompletedActa, MicroChunk, Session } from "$lib/api/types";

interface MicoDB extends DBSchema {
  sessions: {
    key: string;
    value: Session;
    indexes: { byStatus: Session["status"] };
  };
  chunks: {
    key: number;
    value: MicroChunk;
    indexes: { bySession: string; bySessionUploaded: string };
  };
  actas: {
    key: string;
    value: CompletedActa;
  };
  meta: {
    key: string;
    value: { key: string; value: number };
  };
}

let dbPromise: Promise<IDBPDatabase<MicoDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<MicoDB>("mico-db", 1, {
      upgrade(db) {
        const sessions = db.createObjectStore("sessions", { keyPath: "id" });
        sessions.createIndex("byStatus", "status");

        const chunks = db.createObjectStore("chunks", {
          keyPath: "index",
          autoIncrement: true,
        });
        chunks.createIndex("bySession", "sessionId");
        chunks.createIndex("bySessionUploaded", ["sessionId", "uploaded"]);

        db.createObjectStore("actas", { keyPath: "processId" });
        db.createObjectStore("meta", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

export async function saveSession(session: Session): Promise<void> {
  const db = await getDb();
  await db.put("sessions", session);
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await getDb();
  return db.get("sessions", id);
}

export async function getActiveSessions(): Promise<Session[]> {
  const db = await getDb();
  const all = await db.getAll("sessions");
  return all.filter((s) =>
    ["recording", "uploading", "finalizing", "failed"].includes(s.status),
  );
}

export async function getProcessingSessions(): Promise<Session[]> {
  const db = await getDb();
  const all = await db.getAll("sessions");
  return all.filter((s) => s.status === "processing" && s.processId);
}

export async function getInterruptedSessions(): Promise<Session[]> {
  const db = await getDb();
  const all = await db.getAll("sessions");
  return all.filter((s) =>
    ["uploading", "finalizing"].includes(s.status),
  );
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("sessions", id);
  const chunks = await db.getAllFromIndex("chunks", "bySession", id);
  for (const chunk of chunks) {
    await db.delete("chunks", chunk.index);
  }
}

export async function saveMicroChunk(
  sessionId: string,
  blob: Blob,
): Promise<void> {
  const db = await getDb();
  await db.add("chunks", {
    sessionId,
    index: -1,
    blob,
    uploaded: false,
  } as MicroChunk);
}

export async function getUnuploadedChunks(
  sessionId: string,
): Promise<MicroChunk[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("chunks", "bySession", sessionId);
  return all
    .filter((c) => !c.uploaded)
    .sort((a, b) => a.index - b.index);
}

export async function markChunksUploaded(
  sessionId: string,
  chunkIndexes: number[],
): Promise<void> {
  const db = await getDb();
  const set = new Set(chunkIndexes);
  const all = await db.getAllFromIndex("chunks", "bySession", sessionId);
  for (const chunk of all) {
    if (set.has(chunk.index)) {
      await db.put("chunks", { ...chunk, uploaded: true });
    }
  }
}

export async function deleteUploadedChunks(sessionId: string): Promise<void> {
  const db = await getDb();
  const all = await db.getAllFromIndex("chunks", "bySession", sessionId);
  for (const chunk of all) {
    if (chunk.uploaded) {
      await db.delete("chunks", chunk.index);
    }
  }
}

export async function countPendingChunks(sessionId: string): Promise<number> {
  const chunks = await getUnuploadedChunks(sessionId);
  return chunks.length;
}

export async function saveCompletedActa(acta: CompletedActa): Promise<void> {
  const db = await getDb();
  await db.put("actas", acta);
}

export async function getCompletedActas(): Promise<CompletedActa[]> {
  const db = await getDb();
  const all = await db.getAll("actas");
  return all.sort((a, b) => b.completedAt - a.completedAt);
}

export async function deleteCompletedActa(processId: string): Promise<void> {
  const db = await getDb();
  await db.delete("actas", processId);
}

export function createSessionTitle(): string {
  const now = new Date();
  const date = now.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Reunión ${date} ${time}`;
}

export function createFilename(): string {
  return `visita-${Date.now()}.webm`;
}
