<script lang="ts">
  import { onMount } from "svelte";
  import { app } from "$lib/stores/app.svelte";
  import AppHeader from "./AppHeader.svelte";
  import BottomNav from "./BottomNav.svelte";
  import HelpHint from "./HelpHint.svelte";
  import Login from "./login.svelte";
  import PendingUploads from "./PendingUploads.svelte";
  import ProcessedFiles from "./ProcessedFiles.svelte";
  import ProcessingBanner from "./ProcessingBanner.svelte";
  import RecordingPanel from "./RecordingPanel.svelte";
  import StatusBanner from "./StatusBanner.svelte";

  let loginLoading = $state(false);
  let loginError = $state<string | null>(null);

  onMount(() => {
    app.init();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        app.onAppVisible();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", () => app.onAppVisible());

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  });

  async function handleLogin(username: string, password: string) {
    loginLoading = true;
    loginError = null;
    try {
      await app.login(username, password);
    } catch (err) {
      loginError =
        err instanceof Error ? err.message : "No se pudo iniciar sesión";
    } finally {
      loginLoading = false;
    }
  }

  async function handleDiscard(session: import("$lib/api/types").Session) {
    if (confirm("¿Descartar esta reunión? No podrás recuperarla.")) {
      await app.discardSession(session);
    }
  }

  async function handleRemoveActa(acta: import("$lib/api/types").CompletedActa) {
    if (confirm("¿Quitar este acta de la lista?")) {
      await app.removeActa(acta);
    }
  }

  const visiblePending = $derived(
    app.pendingSessions.filter(
      (s) =>
        s.status === "failed" ||
        (s.status === "recording" && !app.isRecording),
    ),
  );

  const pendingCount = $derived(visiblePending.length);
</script>

<div class="app-bg mx-auto min-h-screen max-w-md">
  <div class="wallpaper" aria-hidden="true">
    <div class="blob blob-a"></div>
    <div class="blob blob-b"></div>
    <div class="blob blob-c"></div>
  </div>

  <div class="app-content">
  <AppHeader />

  {#if app.checkingSession}
    <div class="flex flex-col items-center py-28">
      <div class="glass-strong flex h-14 w-14 items-center justify-center rounded-2xl">
        <svg class="h-6 w-6 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
      </div>
      <p class="mt-4 text-sm text-ink-muted">Cargando…</p>
    </div>
  {:else if !app.isLoggedIn}
    <div class="pt-6">
      <Login onLogin={handleLogin} error={loginError} loading={loginLoading} />
    </div>
    <p class="mt-10 text-center text-xs text-ink-muted">
      Desarrollado por <span class="font-semibold text-ink">Aitodetec</span>
    </p>
  {:else}
    {#if app.error}
      <StatusBanner
        message={app.error}
        variant="error"
        onDismiss={() => (app.error = null)}
      />
    {/if}

    {#if app.processingSessions.length > 0 && !app.isRecording}
      <ProcessingBanner
        message={app.statusMessage ?? "Preparando el acta…"}
        progress={app.processingPct}
      />
    {/if}

    {#if app.activeTab === "grabar"}
      <RecordingPanel
        isRecording={app.isRecording}
        durationSec={app.durationSec}
        isBusy={app.isBusy}
        partsUploaded={app.partsUploaded}
        statusMessage={app.statusMessage}
        uploadProgress={app.uploadProgress}
        processingPct={app.processingPct}
        onStart={() => app.startVisit()}
        onStop={() => app.stopVisit()}
      />
      {#if app.isRecording}
        <HelpHint
          text="Mantén la app abierta. El audio se guarda y envía automáticamente cada pocos minutos."
        />
      {:else if !app.isBusy}
        <HelpHint
          text="Pulsa el botón para grabar la reunión. Al terminar, crearemos el acta en PDF."
        />
      {/if}
    {:else if app.activeTab === "pendiente"}
      <div class="pt-4">
        <PendingUploads
          sessions={visiblePending}
          isBusy={app.isBusy}
          onRetry={(s) => app.retrySession(s)}
          onSend={(s) => app.sendInterrupted(s)}
          onDiscard={handleDiscard}
        />
      </div>
    {:else}
      <div class="pt-4">
        <ProcessedFiles
          actas={app.actas}
          onDownload={(a) => app.downloadActa(a)}
          onRemove={handleRemoveActa}
        />
      </div>
    {/if}

    <BottomNav
      active={app.activeTab}
      pendingCount={pendingCount}
      onChange={(tab) => (app.activeTab = tab)}
    />

    <footer class="pb-32 pt-4 text-center text-xs text-ink-muted">
      Desarrollado por <span class="font-semibold text-ink">Aitodetec</span>
    </footer>
  {/if}
  </div>
</div>
