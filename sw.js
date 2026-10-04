const CACHE='xiaomi-tv-home-v7-3';
const CORE=['./','./index.html','./style.css?v=7.3','./app.js?v=7.3','./media.js?v=7.3','./games.js?v=7.3','./input.js?v=7.3','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==self.location.origin)return;
  const core=e.request.mode==='navigate'||/\/(index\.html|style\.css|app\.js|media\.js|games\.js|input\.js|manifest\.webmanifest)$/.test(u.pathname);
  if(core){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{
      if(r.ok){const x=r.clone();caches.open(CACHE).then(c=>c.put(e.request,x))}
      return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});