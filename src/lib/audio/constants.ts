export const MICRO_CHUNK_MS = 10_000;
export const PART_TARGET_SEC = 600;
export const MAX_PART_BYTES = 50 * 1024 * 1024;
export const AUDIO_BITS_PER_SECOND = 48_000;
export const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
] as const;
