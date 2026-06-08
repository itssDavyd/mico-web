<script lang="ts">
  interface Props {
    text: string;
  }
  let { text }: Props = $props();
</script>

<div class="glass mx-6 mt-3 rounded-2xl px-4 py-3">
  <p class="text-center text-xs leading-relaxed text-ink-muted">{text}</p>
</div>
