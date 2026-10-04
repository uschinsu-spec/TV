const CACHE='xiaomi-tv-home-v8-9';
const CORE=['./','./index.html','./style.css?v=8.3','./app.js?v=8.2','./media.js?v=8.2','./games/neon-arena.js?v=8.6','./games.js?v=8.4','./input.js?v=8.5','./games/cultivation-forest.js?v=1.2','./assets/game02/cultivation-forest/forest-bg.svg','./assets/game02/cultivation-forest/player.svg','./assets/game02/cultivation-forest/enemy-wolf.svg','./assets/game02/cultivation-forest/enemy-bandit.svg','./assets/game02/cultivation-forest/enemy-tree.svg','./assets/game02/cultivation-forest/enemy-boar.svg','./assets/game02/cultivation-forest/pickup-spirit.svg','./assets/game02/cultivation-forest/pickup-qi.svg','./assets/game02/cultivation-forest/pickup-gourd.svg','./assets/game02/cultivation-forest/poster.svg','./assets/game02/cultivation-forest/boss-guardian.svg','./assets/game02/cultivation-forest/pickup-talisman.svg','./manifest.webmanifest','./assets/game01/neon-arena/player.svg','./assets/game01/neon-arena/enemy-drone.svg','./assets/game01/neon-arena/enemy-runner.svg','./assets/game01/neon-arena/enemy-tank.svg','./assets/game01/neon-arena/bullet.svg','./assets/game01/neon-arena/pickup-heal.svg','./assets/game01/neon-arena/pickup-bomb.svg','./assets/game01/neon-arena/arena-bg.svg','./assets/game01/neon-arena/poster.svg'];
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