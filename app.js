const VERSION='8.2.0';
const $=id=>document.getElementById(id);
const els={
  clock:$('clock'),today:$('today'),greeting:$('greeting'),
  networkDot:$('networkDot'),networkText:$('networkText'),gamepadStatus:$('gamepadStatus'),
  panel:$('appPanel'),panelTitle:$('panelTitle'),panelEyebrow:$('panelEyebrow'),
  panelBody:$('panelBody'),panelClock:$('panelClock'),backBtn:$('backBtn'),toast:$('toast'),
  fullscreenBtn:$('fullscreenBtn'),wakeBtn:$('wakeBtn'),wakeState:$('wakeState'),reloadBtn:$('reloadBtn'),
  autoFullscreenBtn:$('autoFullscreenBtn'),autoFullscreenState:$('autoFullscreenState'),
  tvModeBtn:$('tvModeBtn'),tvModeState:$('tvModeState')
};
let currentApp='',lastFocused=null,wakeLock=null;
let autoFullscreen=localStorage.getItem('tvAutoFullscreen')!=='0';
let tvMode=localStorage.getItem('tvMode')!=='0';

function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
function showToast(msg){els.toast.textContent=msg;els.toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>els.toast.classList.remove('show'),1900)}
function updateClock(){
  const n=new Date();
  const time=new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(n);
  const date=new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(n);
  els.clock.textContent=time;els.panelClock.textContent=time.slice(0,5);els.today.textContent=date;
  const h=n.getHours();els.greeting.textContent=h<11?'Chào buổi sáng':h<18?'Chào buổi chiều':'Chào buổi tối';
}
function updateNetwork(){
  const on=navigator.onLine;
  els.networkDot.className='dot '+(on?'online':'offline');
  els.networkText.textContent=on?'Internet đã kết nối':'Mất Internet';
}
function syncModeUI(){
  document.body.classList.toggle('tv-mode',tvMode);
  els.autoFullscreenState.textContent=autoFullscreen?'Bật':'Tắt';
  els.tvModeState.textContent=tvMode?'Bật':'Tắt';
  els.autoFullscreenBtn?.classList.toggle('active-setting',autoFullscreen);
  els.tvModeBtn?.classList.toggle('active-setting',tvMode);
}
async function requestTVFullscreen(){
  if(!autoFullscreen||document.fullscreenElement)return;
  try{await document.documentElement.requestFullscreen?.()}catch{}
}
function openApp(name,from){
  lastFocused=from||document.activeElement;
  currentApp=name;
  document.body.classList.add('app-open');
  els.panel.dataset.app=name;
  els.panel.classList.add('open');
  els.panel.setAttribute('aria-hidden','false');
  window.TVInput?.setGameMode?.(false);
  if(name==='tv'){
    els.panelTitle.textContent='Xem TV';
    els.panelEyebrow.textContent='TRUYỀN HÌNH TRỰC TIẾP';
    window.renderTVApp?.();
  }
  if(name==='youtube'){
    els.panelTitle.textContent='YouTube';
    els.panelEyebrow.textContent='VIDEO TRÊN TV';
    window.renderYouTubeApp?.();
  }
  if(name==='game'){
    els.panelTitle.textContent='Game Center';
    els.panelEyebrow.textContent='CHỌN GAME';
    window.renderGameApp?.();
  }
  requestTVFullscreen();
  setTimeout(()=>(els.panelBody.querySelector('.focusable')||els.backBtn)?.focus(),60);
}
function closeApp(){
  window.stopActiveGame?.();
  window.stopTVPlayback?.();
  window.TVInput?.setGameMode?.(false);
  currentApp='';
  document.body.classList.remove('app-open','game-running');
  els.panel.classList.remove('open','game-running');
  els.panel.removeAttribute('data-app');
  els.panel.setAttribute('aria-hidden','true');
  els.panelBody.innerHTML='';
  setTimeout(()=>lastFocused?.focus?.(),0);
}
async function toggleFullscreen(){
  try{
    if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }catch{showToast('TV không cho phép đổi chế độ toàn màn hình')}
}
async function toggleWake(){
  if(wakeLock){await wakeLock.release();wakeLock=null;els.wakeState.textContent='Tắt';return}
  if(!('wakeLock'in navigator))return showToast('TV không hỗ trợ Wake Lock');
  try{
    wakeLock=await navigator.wakeLock.request('screen');
    els.wakeState.textContent='Bật';
    wakeLock.addEventListener('release',()=>{wakeLock=null;els.wakeState.textContent='Tắt'});
  }catch{showToast('Không bật được giữ màn hình sáng')}
}
function toggleAutoFullscreen(){
  autoFullscreen=!autoFullscreen;
  localStorage.setItem('tvAutoFullscreen',autoFullscreen?'1':'0');
  syncModeUI();
  showToast('Tự động toàn màn hình: '+(autoFullscreen?'Bật':'Tắt'));
}
function toggleTVMode(){
  tvMode=!tvMode;
  localStorage.setItem('tvMode',tvMode?'1':'0');
  syncModeUI();
  showToast('TV Mode: '+(tvMode?'Bật':'Tắt'));
}
function getFocusable(){
  const root=els.panel.classList.contains('open')?els.panel:document;
  return [...root.querySelectorAll('.focusable:not([disabled])')]
    .filter(x=>x.offsetParent!==null||x===document.activeElement);
}
function isInput(el){return el&&(['INPUT','TEXTAREA'].includes(el.tagName)||el.isContentEditable)}
function move(dir){
  const items=getFocusable();if(!items.length)return;
  const cur=document.activeElement;
  if(!items.includes(cur)){items[0].focus();return}
  const c=cur.getBoundingClientRect(),cx=c.left+c.width/2,cy=c.top+c.height/2;
  const horizontal=dir==='left'||dir==='right';
  const cand=items.filter(x=>x!==cur).map(el=>{
    const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,dx=x-cx,dy=y-cy;
    const ok=dir==='left'?dx<-8:dir==='right'?dx>8:dir==='up'?dy<-8:dy>8;
    if(!ok)return null;
    const primary=horizontal?Math.abs(dx):Math.abs(dy);
    const cross=horizontal?Math.abs(dy):Math.abs(dx);
    return{el,score:primary+cross*2.35};
  }).filter(Boolean).sort((a,b)=>a.score-b.score);
  if(cand[0]){
    cand[0].el.focus();
    cand[0].el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
  }
}

document.querySelectorAll('[data-app]').forEach(b=>b.addEventListener('click',()=>openApp(b.dataset.app,b)));
els.backBtn.addEventListener('click',closeApp);
els.fullscreenBtn.addEventListener('click',toggleFullscreen);
els.wakeBtn.addEventListener('click',toggleWake);
els.reloadBtn.addEventListener('click',()=>location.reload());
els.autoFullscreenBtn?.addEventListener('click',toggleAutoFullscreen);
els.tvModeBtn?.addEventListener('click',toggleTVMode);

window.addEventListener('online',updateNetwork);
window.addEventListener('offline',updateNetwork);
document.addEventListener('wheel',e=>{if(tvMode)e.preventDefault()},{passive:false});

document.addEventListener('keydown',e=>{
  if(els.gamepadStatus){
    els.gamepadStatus.textContent='🎛 Remote: '+e.key;
    els.gamepadStatus.classList.add('connected');
  }
  if(window.tvGameActive)return;
  const back=['Escape','BrowserBack','GoBack'].includes(e.key)||e.keyCode===4;
  if(back&&els.panel.classList.contains('open')){
    e.preventDefault();closeApp();return;
  }
  const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
  if(map[e.key]){
    if(isInput(document.activeElement)&&(e.key==='ArrowLeft'||e.key==='ArrowRight'))return;
    e.preventDefault();move(map[e.key]);return;
  }
  if((e.key==='Enter'||e.key===' ')&&!isInput(document.activeElement)){
    const el=document.activeElement;
    if(el&&typeof el.click==='function'){e.preventDefault();el.click()}
  }
});

if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').then(r=>r.update()).catch(()=>{}));

window.showToast=showToast;
window.move=move;
window.escapeHtml=escapeHtml;
window.closeApp=closeApp;
window.requestTVFullscreen=requestTVFullscreen;
window.isTVMode=()=>tvMode;

syncModeUI();
updateClock();
updateNetwork();
setInterval(updateClock,1000);
setTimeout(()=>document.querySelector('.app-card')?.focus(),220);
