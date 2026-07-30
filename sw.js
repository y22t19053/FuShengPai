// ===== sw.js · Service Worker 离线缓存 =====
const CACHE_NAME = 'fushangpai-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/src/state.js',
  '/src/domCache.js',
  '/src/ui.js',
  '/src/ui/ui-render.js',
  '/src/ui/ui-drag.js',
  '/src/ui/ui-modal.js',
  '/src/ui/ui-anim.js',
  '/src/data.js',
  '/src/engine.js',
  '/src/storage.js',
  '/src/ai.js',
  '/src/texts/index.js',
  '/src/constants.js',
  '/src/controllers/EventBinder.js',
  '/src/controllers/ActionHandler.js'
  // 如果您有字体或图片文件，也可添加
];

// 安装事件：缓存核心资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 激活事件：清理旧版本缓存
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 拦截请求：优先从缓存读取，没有则网络请求
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});