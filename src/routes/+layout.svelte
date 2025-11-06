<script lang="ts">
  import "../app.css";
  import favicon from "$lib/assets/favicon.ico";
  import { onMount } from "svelte";

  onMount(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js");
    }
  });

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
