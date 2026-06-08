<script lang="ts">
  interface Props {
    subtitle?: string;
  }
  let { subtitle = "Actas de reunión" }: Props = $props();
</script>

<header class="px-5 pt-8 pb-4">
  <div class="glass-strong flex items-center gap-4 rounded-2xl px-5 py-3.5">
    <img src="/logo_aitodetec.png" alt="Aitodetec" class="h-9 w-auto" />
    <div class="h-9 w-px bg-white/50"></div>
    <div>
      <p class="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
        MICO
      </p>
      <p class="text-xs text-ink-muted">{subtitle}</p>
    </div>
  </div>
</header>
