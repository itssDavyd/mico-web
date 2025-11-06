<script lang="ts">
  export let onLoginSuccess: () => void;
  let username = "";
  let password = "";
  let error: string | null = null;
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const login = async () => {
    error = null;
    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) throw new Error("Usuario o contraseña incorrectos");
    } catch (err) {
      error = err instanceof Error ? err.message : "Error desconocido";
      console.warn("Error al iniciar sesión:", err);
    }

    onLoginSuccess?.();
  };
</script>

<div
  class="p-8 max-w-sm mx-auto bg-slate-800 rounded-xl border border-slate-700"
>
  <h2 class="text-white text-xl mb-4">Inicio de Sesión</h2>
  {#if error}
    <p class="text-red-400 mb-2">{error}</p>
  {/if}
  <input
    type="text"
    placeholder="Usuario"
    bind:value={username}
    class="w-full mb-2 p-2 rounded border border-slate-600 bg-slate-700 text-white"
  />
  <input
    type="password"
    placeholder="Contraseña"
    bind:value={password}
    class="w-full mb-4 p-2 rounded border border-slate-600 bg-slate-700 text-white"
  />
  <button
    on:click={login}
    class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
  >
    Acceder
  </button>
</div>
