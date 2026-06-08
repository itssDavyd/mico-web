<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";

  onMount(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {});
    }
  });

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href="/logo_aitodetec.png" />
</svelte:head>

{@render children()}
