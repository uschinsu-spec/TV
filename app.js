const VERSION='4.0.0';
const PREF_KEY='tvToolboxPrefsV4';
const $=id=>document.getElementById(id);
const els={
  clock:$('clock'),today:$('today'),greeting:$('greeting'),networkDot:$('networkDot'),networkText:$('networkText'),connectionText:$('connectionText'),
  fullscreenBtn:$('fullscreenBtn'),fullscreenState:$('fullscreenState'),wakeBtn:$('wakeBtn'),wakeState:$('wakeState'),
  performanceBtn:$('performanceBtn'),performanceState:$('performanceState'),sizeBtn:$('sizeBtn'),sizeState:$('sizeState'),
  screensaverBtn:$('screensaverBtn'),screensaverState:$('screensaverState'),reloadBtn:$('reloadBtn'),
  screensaver:$('screensaver'),screensaverContent:$('screensaverContent'),screensaverClock:$('screensaverClock'),screensaverDate:$('screensaverDate'),
  toast:$('toast'),versionText:$('versionText'),toolDialog:$('toolDialog')
};
let wakeLock=null,lastFocused=null,idleTimer=null,screensaverOn=false;

function readJSON(key,fallback){try{const v=JSON.parse(localStorage.getItem(key));return v??fallback}catch{return fallback}}
function getPrefs(){return {...{performance:false,largeUI:false,screensaver:true,screensaverMinutes:8,wake:false},...readJSON(PREF_KEY,{})}}
function savePrefs(p){localStorage.setItem(PREF_KEY,JSON.stringify(p));applyPrefs()}
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
function showToast(message){els.toast.textContent=message;els.toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>els.toast.classList.remove('show'),2200)}
function openDialog(dialog,from){lastFocused=from||document.activeElement;dialog.showModal();setTimeout(()=>dialog.querySelector('.focusable')?.focus(),0)}
function closeDialog(dialog){if(dialog?.open)dialog.close();setTimeout(()=>lastFocused?.focus?.(),0)}
function closeTopDialog(){const d=document.querySelector('dialog[open]');if(d){closeDialog(d);return true}return false}
function isTextInput(el){return el&&(['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||el.isContentEditable)}

function updateClock(){
  const now=new Date();
  const time=new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
  const date=new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(now);
  els.clock.textContent=time;els.today.textContent=date;els.screensaverClock.textContent=time.slice(0,5);els.screensaverDate.textContent=date;
  const h=now.getHours();els.greeting.textContent=h<11?'Chào buổi sáng':h<18?'Chào buổi chiều':'Chào buổi tối';
}
function updateNetwork(){
  const online=navigator.onLine;els.networkDot.className='dot '+(online?'online':'offline');els.networkText.textContent=online?'Đang kết nối Internet':'Mất kết nối Internet';
  const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection,parts=[];
  if(c?.effectiveType)parts.push(c.effectiveType.toUpperCase());if(typeof c?.downlink==='number')parts.push('~'+c.downlink+' Mbps');
  els.connectionText.textContent=parts.join(' · ');
}
async function toggleFullscreen(){try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.();else await document.exitFullscreen?.();updateFullscreenState()}catch{showToast('Trình duyệt này không cho phép toàn màn hình')}}
function updateFullscreenState(){els.fullscreenState.textContent=document.fullscreenElement?'Bật':'Tắt'}
async function requestWake(){
  if(!('wakeLock'in navigator)){showToast('Browser TV không hỗ trợ Wake Lock');return false}
  try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null;els.wakeState.textContent='Tắt'});els.wakeState.textContent='Bật';return true}catch{showToast('Không thể giữ màn hình sáng');return false}
}
async function toggleWake(){const p=getPrefs();if(wakeLock){await wakeLock.release();p.wake=false;savePrefs(p);return}p.wake=await requestWake();savePrefs(p)}
async function restoreWake(){if(getPrefs().wake&&!wakeLock&&document.visibilityState==='visible')await requestWake()}
function applyPrefs(){
  const p=getPrefs();document.body.classList.toggle('performance',!!p.performance);document.body.classList.toggle('ui-large',!!p.largeUI);
  els.performanceState.textContent=p.performance?'Bật':'Tắt';els.sizeState.textContent=p.largeUI?'Lớn':'Chuẩn';els.screensaverState.textContent=p.screensaver?(p.screensaverMinutes+' phút'):'Tắt';els.wakeState.textContent=wakeLock?'Bật':(p.wake?'Chờ':'Tắt');resetIdle();
}
function togglePerformance(){const p=getPrefs();p.performance=!p.performance;savePrefs(p);showToast(p.performance?'Đã bật chế độ nhẹ':'Đã bật hiệu ứng đầy đủ')}
function toggleSize(){const p=getPrefs();p.largeUI=!p.largeUI;savePrefs(p)}
function cycleScreensaver(){const p=getPrefs();if(!p.screensaver){p.screensaver=true;p.screensaverMinutes=5}else if(p.screensaverMinutes===5)p.screensaverMinutes=8;else if(p.screensaverMinutes===8)p.screensaverMinutes=15;else p.screensaver=false;savePrefs(p)}
function resetIdle(){clearTimeout(idleTimer);if(screensaverOn)return;const p=getPrefs();if(p.screensaver)idleTimer=setTimeout(showScreensaver,p.screensaverMinutes*60000)}
function showScreensaver(){if(document.querySelector('dialog[open]'))return resetIdle();screensaverOn=true;els.screensaver.classList.add('active');shiftScreensaver()}
function hideScreensaver(){if(!screensaverOn)return false;screensaverOn=false;els.screensaver.classList.remove('active');resetIdle();setTimeout(()=>document.querySelector('.direct-card')?.focus(),0);return true}
function shiftScreensaver(){if(!screensaverOn)return;const pts=[[-12,-8],[12,-8],[-12,8],[12,8],[0,0]],p=pts[Math.floor(Date.now()/60000)%pts.length];els.screensaverContent.style.transform='translate('+p[0]+'vw,'+p[1]+'vh)'}

function getFocusable(){
  const root=document.querySelector('dialog[open]')||document;
  return [...root.querySelectorAll('.focusable:not([disabled])')].filter(el=>el.offsetParent!==null||el===document.activeElement);
}
function moveFocus(direction){
  const items=getFocusable();if(!items.length)return;const cur=document.activeElement;if(!items.includes(cur)){items[0].focus();return}
  const c=cur.getBoundingClientRect(),cx=c.left+c.width/2,cy=c.top+c.height/2,h=direction==='left'||direction==='right';
  const cand=items.filter(el=>el!==cur).map(el=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,dx=x-cx,dy=y-cy;const ok=direction==='left'?dx<-8:direction==='right'?dx>8:direction==='up'?dy<-8:dy>8;if(!ok)return null;return{el,score:(h?Math.abs(dx):Math.abs(dy))+(h?Math.abs(dy):Math.abs(dx))*2.35}}).filter(Boolean).sort((a,b)=>a.score-b.score);
  if(cand[0]){cand[0].el.focus({preventScroll:false});cand[0].el.scrollIntoView({block:'nearest',inline:'nearest',behavior:getPrefs().performance?'auto':'smooth'})}
}
document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>closeDialog(b.closest('dialog'))));
els.fullscreenBtn.addEventListener('click',toggleFullscreen);els.wakeBtn.addEventListener('click',toggleWake);els.performanceBtn.addEventListener('click',togglePerformance);els.sizeBtn.addEventListener('click',toggleSize);els.screensaverBtn.addEventListener('click',cycleScreensaver);els.reloadBtn.addEventListener('click',()=>location.reload());
window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);document.addEventListener('fullscreenchange',updateFullscreenState);document.addEventListener('visibilitychange',restoreWake);
['pointerdown','mousemove','touchstart'].forEach(n=>document.addEventListener(n,()=>{if(!hideScreensaver())resetIdle()},{passive:true}));
document.addEventListener('keydown',e=>{
  if(hideScreensaver()){e.preventDefault();return}resetIdle();
  const back=['Escape','BrowserBack','GoBack'].includes(e.key)||e.keyCode===4;
  if(back){if(closeTopDialog()){e.preventDefault();return}if(isTextInput(document.activeElement)){document.activeElement.blur();e.preventDefault();return}}
  const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
  if(map[e.key]){if(isTextInput(document.activeElement)&&(e.key==='ArrowLeft'||e.key==='ArrowRight'))return;e.preventDefault();moveFocus(map[e.key])}
});
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').then(r=>r.update()).catch(()=>{}));
els.versionText.textContent='Xiaomi TV Toolbox V'+VERSION;updateClock();updateNetwork();applyPrefs();restoreWake();updateFullscreenState();setInterval(()=>{updateClock();shiftScreensaver()},1000);setTimeout(()=>document.querySelector('.direct-card')?.focus(),250);
