<script lang="ts">
  interface Props {
    message: string;
    variant?: "info" | "error" | "success";
    onDismiss?: () => void;
  }
  let {
    message,
    variant = "info",
    onDismiss,
  }: Props = $props();

  const accent = {
    info: "border-l-brand",
    error: "border-l-rose-500",
    success: "border-l-emerald-500",
  };
</script>

<div
  class="glass mx-5 mb-4 flex items-start gap-3 border-l-[3px] px-4 py-3 {accent[variant]}"
  role="alert"
>
  <p class="flex-1 text-sm text-ink">{message}</p>
  {#if onDismiss}
    <button
      type="button"
      onclick={onDismiss}
      class="text-ink-muted hover:text-ink"
      aria-label="Cerrar"
    >
      ×
    </button>
  {/if}
</div>
