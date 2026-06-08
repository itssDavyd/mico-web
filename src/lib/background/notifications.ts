export async function requestNotificationPermission(): Promise<void> {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

export async function notifyActaReady(title?: string): Promise<void> {
  const body = title
    ? `El acta "${title}" ya está lista para descargar.`
    : "Ya puedes descargar el acta de la reunión.";

  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    icon: "/logo_aitodetec.png",
    badge: "/logo_aitodetec.png",
    tag: "mico-acta-ready",
    renotify: true,
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification("Tu acta está lista", options);
      return;
    }
  } catch {
    // fallback a notificación de ventana
  }

  new Notification("Tu acta está lista", options);
}
