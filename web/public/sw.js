// Qarin service worker: shows price-alert notifications and opens the product when tapped. No caching.
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: "Qarin", body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || "Qarin", {
    body: d.body || "", icon: "/icon.svg", badge: "/icon.svg", data: { url: d.url || "/" }, tag: d.url || "qarin",
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url === url && "focus" in c) return c.focus();
    return clients.openWindow(url);
  }));
});
