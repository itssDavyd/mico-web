<script lang="ts">
  interface Props {
    message: string;
    progress: number;
  }
  let { message, progress }: Props = $props();
</script>

<div class="glass-strong mx-5 mb-4 overflow-hidden rounded-2xl">
  <div class="h-0.5 bg-gradient-to-r from-brand via-accent to-brand"></div>
  <div class="px-4 py-3.5">
    <p class="text-sm font-semibold text-ink">{message}</p>
    <p class="mt-0.5 text-xs text-ink-muted">Puedes cerrar la app — seguimos trabajando</p>
    {#if progress > 0}
      <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/40">
        <div class="progress-fill h-full" style="width: {progress}%"></div>
      </div>
    {/if}
  </div>
</div>
