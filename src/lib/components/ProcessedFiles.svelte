<script lang="ts">
  import type { CompletedActa } from "$lib/api/types";

  interface Props {
    actas: CompletedActa[];
    onDownload: (acta: CompletedActa) => void;
    onRemove: (acta: CompletedActa) => void;
  }

  let { actas, onDownload, onRemove }: Props = $props();

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<div class="px-5 pb-28">
  {#if actas.length === 0}
    <div class="flex flex-col items-center py-20 text-center">
      <div class="glass-strong mb-5 flex h-20 w-20 items-center justify-center rounded-3xl">
        <svg class="h-9 w-9 text-brand/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <p class="font-semibold text-ink">Sin actas todavía</p>
      <p class="mt-2 max-w-[220px] text-sm text-ink-muted">
        Cuando termines una reunión, el acta aparecerá aquí
      </p>
    </div>
  {:else}
    <p class="mb-4 text-xs font-semibold tracking-wide text-ink-muted uppercase">
      {actas.length} acta{actas.length === 1 ? "" : "s"}
    </p>
    <div class="space-y-2.5">
      {#each actas as acta (acta.processId)}
        <div class="glass flex items-center gap-3 rounded-2xl p-4">
          <div class="glass-strong flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <svg class="h-5 w-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-ink">{acta.title}</p>
            <p class="text-xs text-ink-muted">{formatDate(acta.completedAt)}</p>
          </div>
          <button
            type="button"
            onclick={() => onDownload(acta)}
            class="btn-glass shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold"
          >
            PDF
          </button>
          <button
            type="button"
            onclick={() => onRemove(acta)}
            class="shrink-0 rounded-lg px-2 py-1 text-ink-muted hover:text-ink"
            aria-label="Eliminar"
          >
            ×
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
