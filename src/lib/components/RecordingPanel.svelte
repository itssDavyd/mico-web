<script lang="ts">
  interface Props {
    isRecording: boolean;
    durationSec: number;
    isBusy: boolean;
    partsUploaded: number;
    statusMessage: string | null;
    uploadProgress: number;
    processingPct: number;
    onStart: () => void;
    onStop: () => void;
  }

  let {
    isRecording,
    durationSec,
    isBusy,
    partsUploaded,
    statusMessage,
    uploadProgress,
    processingPct,
    onStart,
    onStop,
  }: Props = $props();

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
</script>

<section class="flex flex-col items-center px-5 py-4">
  <div
    class="relative mb-2 flex h-52 w-52 items-center justify-center"
    class:record-ring={isRecording}
  >
    <div
      class="glass-strong relative z-10 flex h-44 w-44 flex-col items-center justify-center rounded-full
        {isRecording ? 'ring-1 ring-brand/30' : ''}"
    >
      {#if isRecording}
        <span class="mb-2 flex items-center gap-1.5">
          <span class="h-2 w-2 animate-pulse rounded-full bg-rose-500"></span>
          <span class="text-[10px] font-semibold tracking-widest text-rose-500 uppercase"
            >Grabando</span
          >
        </span>
      {/if}
      <p class="font-mono text-[42px] font-semibold tracking-tight text-ink tabular-nums">
        {formatTime(durationSec)}
      </p>
    </div>
  </div>

  {#if isRecording && partsUploaded > 0}
    <p class="mt-3 rounded-full glass px-4 py-1.5 text-xs font-medium text-ink-muted">
      Guardado {partsUploaded} {partsUploaded === 1 ? "vez" : "veces"}
    </p>
  {/if}

  {#if statusMessage}
    <div class="glass mt-6 w-full max-w-xs rounded-2xl p-4">
      <p class="text-center text-sm font-medium text-ink">{statusMessage}</p>
      {#if uploadProgress > 0 || processingPct > 0}
        <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/40">
          <div
            class="progress-fill h-full"
            style="width: {uploadProgress || processingPct}%"
          ></div>
        </div>
      {/if}
    </div>
  {/if}

  <div class="mt-8 w-full max-w-xs">
    {#if !isRecording && !isBusy}
      <button
        type="button"
        onclick={onStart}
        class="btn-glass flex w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-[15px] font-semibold"
      >
        <span class="h-2.5 w-2.5 rounded-full bg-white/90"></span>
        Empezar reunión
      </button>
    {:else if isRecording}
      <button
        type="button"
        onclick={onStop}
        class="btn-stop flex w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-[15px] font-semibold transition active:scale-[0.98]"
      >
        <span class="h-3.5 w-3.5 rounded-sm bg-white/90"></span>
        Finalizar reunión
      </button>
    {:else}
      <div class="glass flex items-center justify-center gap-2 rounded-2xl py-4 text-sm text-ink-muted">
        <svg class="h-4 w-4 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
        Procesando…
      </div>
    {/if}
  </div>
</section>
