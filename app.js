const VERSION='6.4.0';
const $=id=>document.getElementById(id);
const els={clock:$('clock'),today:$('today'),greeting:$('greeting'),networkDot:$('networkDot'),networkText:$('networkText'),gamepadStatus:$('gamepadStatus'),panel:$('appPanel'),panelTitle:$('panelTitle'),panelEyebrow:$('panelEyebrow'),panelBody:$('panelBody'),panelClock:$('panelClock'),backBtn:$('backBtn'),toast:$('toast'),fullscreenBtn:$('fullscreenBtn'),wakeBtn:$('wakeBtn'),wakeState:$('wakeState'),reloadBtn:$('reloadBtn')};
let currentApp='',lastFocused=null,wakeLock=null,lastPadNav=0,padPrev={a:false,b:false,start:false,up:false,down:false,left:false,right:false};

function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
function showToast(msg){els.toast.textContent=msg;els.toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>els.toast.classList.remove('show'),2200)}
function updateClock(){const n=new Date(),time=new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(n),date=new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(n);els.clock.textContent=time;els.panelClock.textContent=time.slice(0,5);els.today.textContent=date;const h=n.getHours();els.greeting.textContent=h<11?'Chào buổi sáng':h<18?'Chào buổi chiều':'Chào buổi tối'}
function updateNetwork(){const on=navigator.onLine;els.networkDot.className='dot '+(on?'online':'offline');els.networkText.textContent=on?'Internet đã kết nối':'Mất Internet'}
function openApp(name,from){lastFocused=from||document.activeElement;currentApp=name;els.panel.classList.add('open');els.panel.setAttribute('aria-hidden','false');if(name==='tv'){els.panelTitle.textContent='Xem TV';els.panelEyebrow.textContent='TRUYỀN HÌNH TRỰC TIẾP';window.renderTVApp?.()}if(name==='youtube'){els.panelTitle.textContent='YouTube';els.panelEyebrow.textContent='YOUTUBE XEM NGAY';window.renderYouTubeApp?.()}if(name==='game'){els.panelTitle.textContent='Game Center';els.panelEyebrow.textContent='10 GAME · F710 READY';window.renderGameApp?.()}setTimeout(()=>els.panel.querySelector('.focusable')?.focus(),70)}
function closeApp(){window.stopActiveGame?.();window.stopTVPlayback?.();currentApp='';els.panel.classList.remove('open');els.panel.setAttribute('aria-hidden','true');els.panelBody.innerHTML='';setTimeout(()=>lastFocused?.focus?.(),0)}
async function toggleFullscreen(){try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.();else await document.exitFullscreen?.()}catch{showToast('Browser TV không cho phép toàn màn hình')}}
async function toggleWake(){if(wakeLock){await wakeLock.release();wakeLock=null;els.wakeState.textContent='Tắt';return}if(!('wakeLock'in navigator))return showToast('Browser không hỗ trợ giữ màn hình sáng');try{wakeLock=await navigator.wakeLock.request('screen');els.wakeState.textContent='Bật';wakeLock.addEventListener('release',()=>{wakeLock=null;els.wakeState.textContent='Tắt'})}catch{showToast('Không bật được Wake Lock')}}
function getFocusable(){const root=els.panel.classList.contains('open')?els.panel:document;return [...root.querySelectorAll('.focusable:not([disabled])')].filter(x=>x.offsetParent!==null||x===document.activeElement)}
function isInput(el){return el&&(['INPUT','TEXTAREA'].includes(el.tagName)||el.isContentEditable)}
function move(dir){const items=getFocusable();if(!items.length)return;const cur=document.activeElement;if(!items.includes(cur)){items[0].focus();return}const c=cur.getBoundingClientRect(),cx=c.left+c.width/2,cy=c.top+c.height/2,h=dir==='left'||dir==='right';const cand=items.filter(x=>x!==cur).map(el=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,dx=x-cx,dy=y-cy,ok=dir==='left'?dx<-8:dir==='right'?dx>8:dir==='up'?dy<-8:dy>8;if(!ok)return null;return{el,score:(h?Math.abs(dx):Math.abs(dy))+(h?Math.abs(dy):Math.abs(dx))*2.2}}).filter(Boolean).sort((a,b)=>a.score-b.score);if(cand[0]){cand[0].el.focus();cand[0].el.scrollIntoView({block:'nearest'})}}
function firstPad(){const list=navigator.getGamepads?navigator.getGamepads():[];for(const p of list)if(p&&p.connected)return p;return null}
function padSnapshot(p){if(!p)return null;const ax=p.axes||[],btn=p.buttons||[],x=Math.abs(ax[0]||0)>.45?(ax[0]||0):0,y=Math.abs(ax[1]||0)>.45?(ax[1]||0):0;return{a:!!btn[0]?.pressed,b:!!btn[1]?.pressed,start:!!btn[9]?.pressed,up:!!btn[12]?.pressed||y<-.5,down:!!btn[13]?.pressed||y>.5,left:!!btn[14]?.pressed||x<-.5,right:!!btn[15]?.pressed||x>.5}}
function pollGamepadUI(){
  const p=firstPad();
  if(p){els.gamepadStatus.textContent='🎮 '+(p.id||'Gamepad');els.gamepadStatus.classList.add('connected')}else{els.gamepadStatus.textContent='🎮 Chưa thấy tay cầm';els.gamepadStatus.classList.remove('connected')}
  if(!window.__TV_NATIVE_GAMEPAD__&&!window.tvGameActive&&p){
    if(window.tvGameInputLockUntil&&performance.now()<window.tvGameInputLockUntil){padPrev=padSnapshot(p);requestAnimationFrame(pollGamepadUI);return}
    const s=padSnapshot(p),now=performance.now();
    const dirs=['up','down','left','right'];
    for(const d of dirs)if(s[d]&&!padPrev[d]&&now-lastPadNav>90){move(d);lastPadNav=now}
    if(s.a&&!padPrev.a){document.activeElement?.click?.()}
    if(s.start&&!padPrev.start){document.activeElement?.click?.()}
    if(s.b&&!padPrev.b&&els.panel.classList.contains('open'))closeApp();
    padPrev=s;
  }else if(!p){padPrev={a:false,b:false,start:false,up:false,down:false,left:false,right:false}}
  requestAnimationFrame(pollGamepadUI);
}
document.querySelectorAll('[data-app]').forEach(b=>b.addEventListener('click',()=>openApp(b.dataset.app,b)));
els.backBtn.addEventListener('click',closeApp);els.fullscreenBtn.addEventListener('click',toggleFullscreen);els.wakeBtn.addEventListener('click',toggleWake);els.reloadBtn.addEventListener('click',()=>location.reload());
window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);
document.addEventListener('keydown',e=>{if(els.gamepadStatus){els.gamepadStatus.textContent='🎛 Remote: '+e.key;els.gamepadStatus.classList.add('connected')}if(window.tvGameActive)return;const back=['Escape','BrowserBack','GoBack'].includes(e.key)||e.keyCode===4;if(back&&els.panel.classList.contains('open')){e.preventDefault();closeApp();return}const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};if(map[e.key]){if(isInput(document.activeElement)&&(e.key==='ArrowLeft'||e.key==='ArrowRight'))return;e.preventDefault();move(map[e.key])}});
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').then(r=>r.update()).catch(()=>{}));
updateClock();updateNetwork();setInterval(updateClock,1000);requestAnimationFrame(pollGamepadUI);setTimeout(()=>document.querySelector('.app-card')?.focus(),250);
