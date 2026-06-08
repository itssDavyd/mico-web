import {
  AUDIO_BITS_PER_SECOND,
  MICRO_CHUNK_MS,
  MIME_CANDIDATES,
} from "./constants";

export type ChunkHandler = (blob: Blob) => void | Promise<void>;

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private onChunk: ChunkHandler | null = null;

  static getSupportedMimeType(): string {
    for (const mime of MIME_CANDIDATES) {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    }
    return "audio/webm";
  }

  async acquireStream(): Promise<MediaStream> {
    if (this.stream) return this.stream;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return this.stream;
  }

  async start(onChunk: ChunkHandler): Promise<void> {
    const stream = await this.acquireStream();
    this.onChunk = onChunk;

    const mimeType = AudioRecorder.getSupportedMimeType();
    const options: MediaRecorderOptions = {
      mimeType,
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    };

    this.mediaRecorder = new MediaRecorder(stream, options);

    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && this.onChunk) {
        await this.onChunk(event.data);
      }
    };

    this.mediaRecorder.start(MICRO_CHUNK_MS);
    await this.requestWakeLock();
  }

  stop(): void {
    if (this.mediaRecorder?.state !== "inactive") {
      this.mediaRecorder?.stop();
    }
    this.releaseWakeLock();
  }

  releaseMic(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
  }

  private async requestWakeLock(): Promise<void> {
    try {
      if ("wakeLock" in navigator) {
        this.wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch {
      // Wake Lock no disponible — no bloquear grabación
    }
  }

  private releaseWakeLock(): void {
    this.wakeLock?.release().catch(() => {});
    this.wakeLock = null;
  }
}
