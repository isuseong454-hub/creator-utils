/* 아이디어 폴더 — 홈 화면 설치용 서비스 워커
   ⚠️ 설계 원칙: «네트워크 우선»
   - 온라인이면 항상 서버의 최신 파일을 쓴다  → «배포했는데 안 바뀜» 사고 방지
   - 오프라인일 때만 캐시 사본을 꺼낸다
   - 같은 주소(same-origin)의 GET만 손댄다   → 로그인·API·외부 요청은 건드리지 않음
*/
const CACHE = 'idea-folder-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // POST 등은 그대로 통과
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;        // 외부 주소는 그대로 통과

  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (_) {
      const hit = await caches.match(req);
      return hit || Response.error();
    }
  })());
});
