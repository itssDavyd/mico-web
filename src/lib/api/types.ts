export type SessionStatus =
  | "recording"
  | "uploading"
  | "finalizing"
  | "processing"
  | "done"
  | "failed";

export interface CreateSessionResponse {
  id: string;
}

export interface FinalizeResponse {
  process_id?: string;
  id?: string;
}

export interface StatusResponse {
  status: string;
  parts_uploaded?: number;
  parts_transcribed?: number;
  parts_total?: number;
  progress_pct?: number;
  download_url?: string;
  error?: string;
}

export interface Session {
  id: string;
  serverSessionId: string;
  processId?: string;
  title: string;
  durationSec: number;
  nextPartIndex: number;
  partBytesPending: number;
  lastPartUploadedAtSec: number;
  status: SessionStatus;
  createdAt: number;
}

export interface MicroChunk {
  sessionId: string;
  index: number;
  blob: Blob;
  uploaded: boolean;
}

export interface CompletedActa {
  processId: string;
  title: string;
  completedAt: number;
  downloadUrl: string;
  filename?: string;
}

export type AppTab = "grabar" | "pendiente" | "actas";
