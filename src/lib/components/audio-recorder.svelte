<script lang="ts">
  import { onMount } from "svelte";
  import Login from "./login.svelte";

  let files: string[] = $state([]);
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let isRecording = $state(false);
  let recordingTime = $state(0);
  let audioUrl: string | null = $state(null);
  let error: string | null = $state(null);
  let isProcessing = $state(false);
  let processId: string | null = $state(null);
  let pollingInterval: NodeJS.Timeout | null = null;
  let recordingInterval: NodeJS.Timeout | null = null;
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  let isLoggedIn = $state(false);
  let checkingSession = $state(true);

  onMount(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }

    checkSession();

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          audioUrl = URL.createObjectURL(audioBlob);
          audioChunks = [];
        };
      })
      .catch((err) => {
        error =
          "No se pudo acceder al micrófono. Por favor, verifica los permisos.";
        console.error("Error al acceder al micrófono:", err);
      });

    fetchFiles(); // obtener lista inicial

    return () => clearInterval(setInterval(fetchFiles, 5000));
  });

  const startRecording = () => {
    if (!mediaRecorder) return;

    error = null;
    audioChunks = [];
    audioUrl = null;
    recordingTime = 0;
    isRecording = true;

    mediaRecorder.start();

    recordingInterval = setInterval(() => {
      recordingTime += 1;
    }, 1000);
  };

  const stopRecording = () => {
    if (!mediaRecorder) return;

    mediaRecorder.stop();
    isRecording = false;

    if (recordingInterval) {
      clearInterval(recordingInterval);
    }
  };

  const processAudio = async () => {
    if (!audioUrl) return;

    isProcessing = true;
    error = null;

    try {
      const response = await fetch(audioUrl);
      const audioBlob = await response.blob();
      const formData = new FormData();

      formData.append("file", audioBlob, "recording.webm");

      if (!BACKEND_URL) {
        throw new Error("VITE_BACKEND_URL no está configurado");
      }

      const result = await fetch(`${BACKEND_URL}/audio/process`, {
        method: "POST",
        body: formData,
      });

      if (!result.ok) {
        throw new Error("Error al procesar el audio");
      }

      const { process_id } = await result.json();
      processId = process_id;

      audioUrl = null;
      recordingTime = 0;
      isProcessing = true;
      pollingInterval = setInterval(checkStatus, 80000);
    } catch (err) {
      error = `Error: ${err instanceof Error ? err.message : "Error desconocido"}`;
      console.error("Error al procesar:", err);
    } finally {
      isProcessing = false;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const notifyCompletion = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification(
            "✅ Tu resumen está listo revisa el listado de archivos"
          );
        }
      });
    }
  };

  const checkStatus = async () => {
    if (!processId) return;

    try {
      const res = await fetch(`${BACKEND_URL}/audio/status/${processId}`);
      const data = await res.json();

      if (data.status === "done") {
        clearInterval(pollingInterval!);
        pollingInterval = null;
        isProcessing = false;
        await fetchFiles();
        notifyCompletion();
        processId = null;
      }
    } catch (err) {
      console.error("Error checking status:", err);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/file/list`);
      const data = await res.json();
      files = data.files;
    } catch (e) {
      console.error("Error al obtener archivos:", e);
    }
  };

  const deleteFile = async (file: string) => {
    if (!confirm(`¿Seguro que quieres eliminar "${file}"?`)) return;

    try {
      await fetch(`${BACKEND_URL}/file/delete/${file}`, {
        method: "DELETE",
      });
      await fetchFiles();
    } catch (err) {
      console.error("Error eliminando archivo:", err);
    }
  };

  const checkSession = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/protected`, {
        credentials: "include",
      });
      isLoggedIn = res.ok;
    } catch {
      isLoggedIn = false;
    } finally {
      checkingSession = false;
    }
  };

  const handleLoginSuccess = () => {
    checkSession();
  };
</script>

<div
  class="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4"
>
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-white mb-2">🎙️ MICO</h1>
      <p class="text-slate-400">Meeting Intelligence & Content Organizer</p>
    </div>
    {#if checkingSession}
      <!-- Opcional: loader mientras se valida sesión -->
      <div class="text-white text-center mt-20">Cargando...</div>
    {:else if isLoggedIn}
      <div
        class="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700"
      >
        <div class="mb-8 text-center">
          <div
            class="inline-block bg-linear-to-r from-blue-500 to-cyan-500 rounded-full p-8 shadow-lg"
          >
            <div class="text-4xl font-bold text-white font-mono">
              {formatTime(recordingTime)}
            </div>
          </div>
        </div>
        {#if error}
          <div
            class="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg"
          >
            <p class="text-red-400 text-sm">{error}</p>
          </div>
        {/if}
        <div class="flex gap-4 mb-6">
          {#if !isRecording && !audioUrl}
            <button
              onclick={startRecording}
              class="flex-1 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              <span class="flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" />
                </svg>
                Grabar
              </span>
            </button>
          {:else if isRecording}
            <button
              onclick={stopRecording}
              class="flex-1 bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              <span class="flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <rect x="6" y="6" width="8" height="8" />
                </svg>
                Parar
              </span>
            </button>
          {:else if audioUrl}
            <button
              onclick={() => {
                audioUrl = null;
                recordingTime = 0;
              }}
              class="flex-1 bg-linear-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              <span class="flex items-center justify-center gap-2">
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Nueva
              </span>
            </button>
          {/if}
        </div>
        {#if audioUrl}
          <div
            class="mb-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600"
          >
            <p class="text-slate-300 text-sm mb-3 font-semibold">
              Audio grabado:
            </p>
            <audio
              src={audioUrl}
              controls
              class="w-full rounded-lg"
              preload="metadata"
            ></audio>
          </div>
        {/if}
        {#if audioUrl}
          <button
            onclick={processAudio}
            disabled={isProcessing}
            class="w-full bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg disabled:cursor-not-allowed"
          >
            {#if isProcessing}
              <span class="flex items-center justify-center gap-2">
                <svg
                  class="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Procesando...
              </span>
            {:else}
              <span class="flex items-center justify-center gap-2">
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Procesar Audio
              </span>
            {/if}
          </button>
        {/if}
      </div>
      {#if files.length > 0}
        <div
          class="mt-8 bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl"
        >
          <h2 class="text-white text-lg font-semibold mb-3">
            Archivos procesados
          </h2>

          <div class="max-h-64 overflow-y-auto pr-2 space-y-3">
            {#each files as file}
              <div
                class="flex items-center justify-between bg-slate-800 border border-slate-700 p-2 rounded-xl shadow-lg hover:bg-slate-750 transition"
              >
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-slate-700 rounded-lg">
                    <svg
                      class="w-6 h-6 text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M7 3h6l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"
                      />
                    </svg>
                  </div>
                  <span class="text-slate-300 text-sm truncate max-w-[180px]"
                    >{file}</span
                  >
                </div>

                <div class="flex items-center gap-2">
                  <a
                    href={`${BACKEND_URL}/file/download/${file}`}
                    download
                    class="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition"
                  >
                    ↓
                  </a>

                  <button
                    onclick={() => deleteFile(file)}
                    class="text-sm px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {:else}
      <Login onLoginSuccess={handleLoginSuccess} />
    {/if}
    <div class="mt-6 text-center text-slate-400 text-sm">
      <p>Powered by <a href="https://ledmon.com/">Ledmon Marketing</a></p>
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }
  :global(.max-h-64::-webkit-scrollbar) {
    width: 6px;
  }

  :global(.max-h-64::-webkit-scrollbar-thumb) {
    background: #475569;
    border-radius: 6px;
  }

  :global(.max-h-64::-webkit-scrollbar-thumb:hover) {
    background: #64748b;
  }
</style>
