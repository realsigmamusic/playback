const CACHE_NAME = 'v1.1.0';
const ASSETS = [
	'./',
	'./index.html',
	'./style.css',
	'./main.js',
	'./manifest.json',
	'./maskable_icon_x512.png'
];

// 1. Instalação: Salva os arquivos no cache
self.addEventListener('install', (e) => {
	e.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(ASSETS);
		})
	);
});

// 2. Ativação: Limpa caches antigos se mudar a versão
self.addEventListener('activate', (e) => {
	e.waitUntil(
		caches.keys().then((keyList) => {
			return Promise.all(
				keyList.map((key) => {
					if (key !== CACHE_NAME) {
						return caches.delete(key);
					}
				})
			);
		})
	);
});

// 3. Interceptação: Serve o arquivo do cache se estiver offline
self.addEventListener('fetch', (e) => {
	e.respondWith(
		caches.match(e.request).then((response) => {
			return response || fetch(e.request);
		})
	);
});