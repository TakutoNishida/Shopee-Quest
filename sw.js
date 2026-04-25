// Quest Board Service Worker
// オフラインでもアプリが起動するようにキャッシュ

const CACHE_VERSION = 'quest-board-v1';
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
];

// インストール時：必要なファイルをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(CACHE_FILES).catch((err) => {
        console.warn('一部キャッシュ失敗:', err);
        // 失敗しても続行（一部ファイルが無くても動く）
      });
    })
  );
  self.skipWaiting();
});

// 有効化時：古いバージョンのキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// リクエスト時：キャッシュ優先、無ければネットワーク
self.addEventListener('fetch', (event) => {
  // GETのみ対象
  if (event.request.method !== 'GET') return;

  // 外部リソース（Google Fontsなど）はネットワーク優先＋キャッシュ
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 同一オリジン：キャッシュ優先
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        // 取得成功したらキャッシュにも追加
        const clone = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        return res;
      });
    }).catch(() => {
      // 完全オフラインかつキャッシュ無しの場合はindex.htmlを返す
      return caches.match('./index.html');
    })
  );
});
