<script lang="ts">
  import { DEV_CREDENTIALS_HINT, isDevMockEnabled } from "$lib/api/dev-auth";

  interface Props {
    onLogin: (username: string, password: string) => Promise<void>;
    error?: string | null;
    loading?: boolean;
  }

  let { onLogin, error = null, loading = false }: Props = $props();

  const isDev = isDevMockEnabled();
  let username = $state(isDev ? "admin" : "");
  let password = $state(isDev ? "admin" : "");

  async function submit(e: Event) {
    e.preventDefault();
    await onLogin(username, password);
  }
</script>

<div class="glass-strong mx-5 rounded-3xl p-7">
  <div class="mb-6 text-center">
    <h2 class="text-lg font-semibold text-ink">Iniciar sesión</h2>
    <p class="mt-1 text-sm text-ink-muted">Introduce tus credenciales</p>
  </div>

  <form onsubmit={submit} class="space-y-4">
    <div>
      <label for="username" class="mb-1.5 block text-xs font-semibold text-ink-muted">
        Usuario
      </label>
      <input
        id="username"
        type="text"
        bind:value={username}
        autocomplete="username"
        required
        class="input-glass w-full rounded-xl px-4 py-3.5 text-[15px] text-ink"
        placeholder="Tu usuario"
      />
    </div>
    <div>
      <label for="password" class="mb-1.5 block text-xs font-semibold text-ink-muted">
        Contraseña
      </label>
      <input
        id="password"
        type="password"
        bind:value={password}
        autocomplete="current-password"
        required
        class="input-glass w-full rounded-xl px-4 py-3.5 text-[15px] text-ink"
        placeholder="Tu contraseña"
      />
    </div>
    {#if isDev}
      <p class="glass rounded-xl px-4 py-3 text-xs text-ink-muted">
        Desarrollo: <strong class="text-ink">{DEV_CREDENTIALS_HINT}</strong>
      </p>
    {/if}
    {#if error}
      <p class="rounded-xl bg-rose-50/80 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">
        {error}
      </p>
    {/if}
    <button
      type="submit"
      disabled={loading}
      class="btn-glass w-full rounded-2xl py-4 text-[15px] font-semibold disabled:opacity-50"
    >
      {loading ? "Entrando…" : "Entrar"}
    </button>
  </form>
</div>
