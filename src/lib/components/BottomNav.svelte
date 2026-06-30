<script lang="ts">
  import type { AppTab } from "$lib/api/types";

  interface Props {
    active: AppTab;
    pendingCount: number;
    onChange: (tab: AppTab) => void;
  }

  let { active, pendingCount, onChange }: Props = $props();

  const tabs: { id: AppTab; label: string; icon: "mic" | "pending" | "doc" }[] = [
    { id: "grabar", label: "Grabar", icon: "mic" },
    { id: "pendiente", label: "Pendiente", icon: "pending" },
    { id: "actas", label: "Actas", icon: "doc" },
  ];
</script>

<nav class="fixed bottom-0 left-0 right-0 z-50 px-5 pb-safe" aria-label="Navegación">
  <div class="glass-nav mx-auto flex max-w-md items-center justify-around rounded-[22px] px-1 py-1.5">
    {#each tabs as tab (tab.id)}
      <button
        type="button"
        onclick={() => onChange(tab.id)}
        class="relative flex flex-1 flex-col items-center gap-0.5 rounded-[16px] py-2.5 text-[11px] font-semibold transition-all duration-200
          {active === tab.id
          ? 'glass-tab-active text-brand'
          : 'text-ink-muted'}"
        aria-current={active === tab.id ? "page" : undefined}
      >
        {#if tab.icon === "mic"}
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 10v1a7 7 0 01-14 0v-1M12 18v4"/>
          </svg>
        {:else if tab.icon === "pending"}
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        {:else}
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        {/if}
        {tab.label}
        {#if tab.id === "pendiente" && pendingCount > 0}
          <span
            class="absolute right-3 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm"
          >
            {pendingCount}
          </span>
        {/if}
      </button>
    {/each}
  </div>
</nav>

<style>
  .pb-safe {
    padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
  }
</style>
