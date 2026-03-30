const SHELL_CACHE = "mia-paris-shell-v1";
const STATIC_CACHE = "mia-paris-static-v1";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/pwa-icon.svg",
  "/icons/pwa-icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([clearOutdatedCaches(), self.clients.claim()]));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (
    ["font", "image", "script", "style", "worker"].includes(request.destination)
  ) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const title = payload.title || "MIA PARIS";
  const options = {
    badge: "/icons/pwa-icon-maskable.svg",
    body: payload.body || "Une mise à jour métier demande ton attention.",
    data: payload.data || {},
    icon: "/icons/pwa-icon.svg",
    tag: payload.tag || "mia-paris-alert",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    event.notification.data?.url && typeof event.notification.data.url === "string"
      ? event.notification.data.url
      : "/aujourdhui";

  event.waitUntil(focusOrOpenClient(targetUrl));
});

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);

    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match(OFFLINE_URL)) ||
      new Response("Mode hors ligne", {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
        status: 503,
      })
    );
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response && response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }

  return response;
}

async function clearOutdatedCaches() {
  const keys = await caches.keys();
  const validKeys = new Set([SHELL_CACHE, STATIC_CACHE]);

  await Promise.all(
    keys.map((key) => {
      if (validKeys.has(key)) {
        return Promise.resolve();
      }

      return caches.delete(key);
    }),
  );
}

async function focusOrOpenClient(targetUrl) {
  const clientsList = await clients.matchAll({
    includeUncontrolled: true,
    type: "window",
  });

  for (const client of clientsList) {
    if (!("focus" in client)) {
      continue;
    }

    const currentUrl = new URL(client.url);

    if (currentUrl.pathname === targetUrl || currentUrl.href === targetUrl) {
      return client.focus();
    }
  }

  if (clients.openWindow) {
    return clients.openWindow(targetUrl);
  }

  return undefined;
}

function readPushPayload(event) {
  if (!event.data) {
    return {};
  }

  try {
    return event.data.json();
  } catch {
    return {
      body: event.data.text(),
    };
  }
}
