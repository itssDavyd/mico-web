import {
  clearDevMockSession,
  isDevMockSession,
  tryDevLogin,
} from "./dev-auth";
import type {
  CreateSessionResponse,
  FinalizeResponse,
  StatusResponse,
} from "./types";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;

function baseUrl(): string {
  if (!BACKEND_URL) throw new Error("VITE_BACKEND_URL no está configurado");
  return BACKEND_URL;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function login(username: string, password: string): Promise<void> {
  if (tryDevLogin(username, password)) return;

  const res = await fetch(`${baseUrl()}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Usuario o contraseña incorrectos");
}

export async function checkAuth(): Promise<boolean> {
  if (isDevMockSession()) return true;

  try {
    const res = await fetch(`${baseUrl()}/auth/protected`, {
      credentials: "include",
    });
    return res.ok;
  } catch {
    return isDevMockSession();
  }
}

export function logoutApi(): void {
  clearDevMockSession();
}

export async function createSession(
  filename?: string,
): Promise<CreateSessionResponse> {
  const form = new FormData();
  if (filename) form.append("filename", filename);

  const res = await fetch(`${baseUrl()}/audio/sessions`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return handleResponse<CreateSessionResponse>(res);
}

export async function uploadPart(
  sessionId: string,
  partIndex: number,
  file: Blob,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("part_index", String(partIndex));
    form.append("file", file, `part-${partIndex}.webm`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 401) {
        reject(new Error("UNAUTHORIZED"));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(xhr.responseText || `Error ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error("Error de red al enviar"));
    xhr.open("POST", `${baseUrl()}/audio/sessions/${sessionId}/parts`);
    xhr.withCredentials = true;
    xhr.send(form);
  });
}

export async function finalizeSession(
  sessionId: string,
): Promise<FinalizeResponse> {
  const res = await fetch(
    `${baseUrl()}/audio/sessions/${sessionId}/finalize`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  return handleResponse<FinalizeResponse>(res);
}

export async function getStatus(processId: string): Promise<StatusResponse> {
  const res = await fetch(`${baseUrl()}/audio/status/${processId}`, {
    credentials: "include",
  });
  return handleResponse<StatusResponse>(res);
}

export async function downloadFile(url: string): Promise<Blob> {
  const fullUrl = url.startsWith("http") ? url : `${baseUrl()}${url}`;
  const res = await fetch(fullUrl, { credentials: "include" });
  if (!res.ok) throw new Error("No se pudo descargar el archivo");
  return res.blob();
}

export function getBackendUrl(): string {
  return baseUrl();
}
