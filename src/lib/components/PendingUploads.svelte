<script lang="ts">
  import type { Session } from "$lib/api/types";

  interface Props {
    sessions: Session[];
    isBusy: boolean;
    onRetry: (session: Session) => void;
    onSend: (session: Session) => void;
    onDiscard: (session: Session) => void;
  }

  let { sessions, isBusy, onRetry, onSend, onDiscard }: Props = $props();

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<div class="px-5 pb-28">
  {#if sessions.length === 0}
    <div class="flex flex-col items-center py-20 text-center">
      <div class="glass-strong mb-5 flex h-20 w-20 items-center justify-center rounded-3xl">
        <svg class="h-9 w-9 text-emerald-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <p class="font-semibold text-ink">Todo al día</p>
      <p class="mt-2 text-sm text-ink-muted">No hay reuniones pendientes</p>
    </div>
  {:else}
    <div class="space-y-2.5">
      {#each sessions as session (session.id)}
        <div class="glass rounded-2xl p-4">
          <p class="font-semibold text-ink">{session.title}</p>
          <p class="mt-0.5 text-xs text-ink-muted">{formatDate(session.createdAt)}</p>
          <p class="mt-2 text-sm text-ink-muted">
            {#if session.status === "failed"}
              Sin conexión. Comprueba el WiFi e inténtalo de nuevo.
            {:else if session.status === "finalizing" || session.status === "uploading"}
              Enviando…
            {:else if session.status === "recording"}
              Reunión sin terminar de enviar.
            {:else}
              Pendiente de envío
            {/if}
          </p>
          {#if session.status === "failed" || session.status === "recording"}
            <div class="mt-4 flex gap-2">
              <button
                type="button"
                onclick={() =>
                  session.status === "failed"
                    ? onRetry(session)
                    : onSend(session)}
                disabled={isBusy}
                class="btn-glass flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {session.status === "failed" ? "Reintentar" : "Crear acta"}
              </button>
              <button
                type="button"
                onclick={() => onDiscard(session)}
                disabled={isBusy}
                class="glass rounded-xl px-4 py-2.5 text-sm text-ink-muted"
              >
                Descartar
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
