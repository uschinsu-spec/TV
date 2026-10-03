const TILE_KEY='tvHubTilesV2';
const PREF_KEY='tvHubPrefsV2';
const OLD_TILE_KEY='tvUtilityTilesV1';
const VERSION='2.0.0';

const defaultTiles=[
  {icon:'▶️',title:'YouTube',url:'https://www.youtube.com/tv'},
  {icon:'🎵',title:'YouTube Music',url:'https://music.youtube.com/'},
  {icon:'🌐',title:'Google',url:'https://www.google.com/'},
  {icon:'⚡',title:'Kiểm tra mạng',url:'https://fast.com/'},
  {icon:'📰',title:'Tin tức',url:'https://news.google.com/'},
  {icon:'📚',title:'Wikipedia',url:'https://vi.wikipedia.org/'},
  {icon:'☁️',title:'Google Drive',url:'https://drive.google.com/'},
  {icon:'🗺️',title:'Bản đồ',url:'https://maps.google.com/'},
  {icon:'📺',title:'TV của tôi',url:'https://example.com/'},
  {icon:'⭐',title:'Yêu thích 1',url:'https://example.com/'},
  {icon:'⭐',title:'Yêu thích 2',url:'https://example.com/'},
  {icon:'🧭',title:'Website khác',url:'https://example.com/'}
];

const $=id=>document.getElementById(id);
const els={
  tiles:$('tiles'),clock:$('clock'),today:$('today'),greeting:$('greeting'),
  searchInput:$('searchInput'),searchBtn:$('searchBtn'),
  networkDot:$('networkDot'),networkText:$('networkText'),connectionText:$('connectionText'),
  fullscreenBtn:$('fullscreenBtn'),fullscreenState:$('fullscreenState'),
  wakeBtn:$('wakeBtn'),wakeState:$('wakeState'),
  performanceBtn:$('performanceBtn'),performanceState:$('performanceState'),
  sizeBtn:$('sizeBtn'),sizeState:$('sizeState'),
  screensaverBtn:$('screensaverBtn'),screensaverState:$('screensaverState'),
  infoBtn:$('infoBtn'),installBtn:$('installBtn'),reloadBtn:$('reloadBtn'),settingsBtn:$('settingsBtn'),
  settingsDialog:$('settingsDialog'),settingsForm:$('settingsForm'),settingsList:$('settingsList'),resetBtn:$('resetBtn'),
  infoDialog:$('infoDialog'),deviceInfo:$('deviceInfo'),screensaver:$('screensaver'),
  screensaverContent:$('screensaverContent'),screensaverClock:$('screensaverClock'),screensaverDate:$('screensaverDate'),
  toast:$('toast'),versionText:$('versionText')
};

let wakeLock=null;
let installPrompt=null;
let lastFocused=null;
let idleTimer=null;
let screensaverOn=false;

function readJSON(key,fallback){
  try{const v=JSON.parse(localStorage.getItem(key));return v??fallback}catch{return fallback}
}
function getTiles(){
  let v=readJSON(TILE_KEY,null);
  if(Array.isArray(v)&&v.length)return normalizeTiles(v);
  const old=readJSON(OLD_TILE_KEY,null);
  if(Array.isArray(old)&&old.length){
    v=normalizeTiles(old);
    localStorage.setItem(TILE_KEY,JSON.stringify(v));
    return v;
  }
  return defaultTiles.map(x=>({...x}));
}
function normalizeTiles(items){
  const out=items.slice(0,12).map((x,i)=>({
    icon:String(x.icon||'🌐').slice(0,8),
    title:String(x.title||('Trang '+(i+1))).slice(0,48),
    url:String(x.url||'https://example.com/')
  }));
  while(out.length<12)out.push({...defaultTiles[out.length]});
  return out;
}
function getPrefs(){
  return {...{performance:false,largeUI:false,screensaver:true,screensaverMinutes:8,wake:false},...readJSON(PREF_KEY,{})};
}
function savePrefs(p){localStorage.setItem(PREF_KEY,JSON.stringify(p));applyPrefs()}

function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
function safeUrl(raw){
  let value=String(raw||'').trim();
  if(!value)return null;
  if(!/^https?:\/\//i.test(value))value='https://'+value;
  try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:null}catch{return null}
}
function looksLikeUrl(value){
  const v=String(value||'').trim();
  return /^https?:\/\//i.test(v)||/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/|$)/i.test(v)||/^[\w-]+(\.[\w-]+)+([/:?#].*)?$/i.test(v);
}
function openSearch(value){
  const q=String(value||'').trim();
  if(!q)return showToast('Hãy nhập từ khóa hoặc địa chỉ web');
  const target=looksLikeUrl(q)?safeUrl(q):'https://www.google.com/search?q='+encodeURIComponent(q);
  if(!target)return showToast('Địa chỉ không hợp lệ');
  location.href=target;
}
function openWebsite(url){
  const target=safeUrl(url);
  if(!target)return showToast('Địa chỉ web không hợp lệ');
  location.href=target;
}

function renderTiles(){
  els.tiles.innerHTML='';
  getTiles().forEach((item,index)=>{
    const b=document.createElement('button');
    b.className='tile focusable';
    b.dataset.index=index;
    b.innerHTML='<span class="tile-icon" aria-hidden="true">'+escapeHtml(item.icon)+'</span>'+
      '<span class="tile-title">'+escapeHtml(item.title)+'</span>'+
      '<span class="tile-url">'+escapeHtml(item.url)+'</span>';
    b.addEventListener('click',()=>openWebsite(item.url));
    els.tiles.appendChild(b);
  });
}
function renderSettings(){
  els.settingsList.innerHTML='';
  getTiles().forEach((item,index)=>{
    const row=document.createElement('div');row.className='setting-row';
    row.innerHTML=
      '<input class="focusable icon-field" data-i="'+index+'" data-k="icon" aria-label="Biểu tượng ô '+(index+1)+'" value="'+escapeHtml(item.icon)+'">'+
      '<input class="focusable" data-i="'+index+'" data-k="title" aria-label="Tên ô '+(index+1)+'" value="'+escapeHtml(item.title)+'">'+
      '<input class="focusable url-field" data-i="'+index+'" data-k="url" aria-label="URL ô '+(index+1)+'" value="'+escapeHtml(item.url)+'">';
    els.settingsList.appendChild(row);
  });
}
function saveSettings(){
  const data=getTiles().map(x=>({...x}));
  els.settingsList.querySelectorAll('input[data-i]').forEach(input=>{
    data[Number(input.dataset.i)][input.dataset.k]=input.value.trim();
  });
  for(const item of data){if(!safeUrl(item.url)){showToast('URL chưa hợp lệ: '+(item.title||'một ô'));return false}}
  localStorage.setItem(TILE_KEY,JSON.stringify(normalizeTiles(data)));
  renderTiles();showToast('Đã lưu launcher');return true;
}

function updateClock(){
  const now=new Date();
  const time=new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
  const date=new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(now);
  els.clock.textContent=time;els.today.textContent=date;
  els.screensaverClock.textContent=time.slice(0,5);els.screensaverDate.textContent=date;
  const h=now.getHours();els.greeting.textContent=h<11?'Chào buổi sáng':h<18?'Chào buổi chiều':'Chào buổi tối';
}
function updateNetwork(){
  const online=navigator.onLine;
  els.networkDot.className='dot '+(online?'online':'offline');
  els.networkText.textContent=online?'Đang kết nối Internet':'Mất kết nối Internet';
  const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  const parts=[];
  if(c?.effectiveType)parts.push(c.effectiveType.toUpperCase());
  if(typeof c?.downlink==='number')parts.push('~'+c.downlink+' Mbps');
  els.connectionText.textContent=parts.join(' · ');
}

async function toggleFullscreen(){
  try{
    if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
    updateFullscreenState();
  }catch{showToast('Trình duyệt này không cho phép toàn màn hình')}
}
function updateFullscreenState(){els.fullscreenState.textContent=document.fullscreenElement?'Bật':'Tắt'}

async function requestWake(){
  if(!('wakeLock' in navigator)){showToast('Trình duyệt TV không hỗ trợ Wake Lock');return false}
  try{
    wakeLock=await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release',()=>{wakeLock=null;els.wakeState.textContent='Tắt'});
    els.wakeState.textContent='Bật';return true;
  }catch{showToast('Không thể giữ màn hình sáng');return false}
}
async function toggleWake(){
  const p=getPrefs();
  if(wakeLock){await wakeLock.release();p.wake=false;savePrefs(p);return}
  const ok=await requestWake();p.wake=ok;savePrefs(p);
}
async function restoreWake(){if(getPrefs().wake&&!wakeLock&&document.visibilityState==='visible')await requestWake()}

function applyPrefs(){
  const p=getPrefs();
  document.body.classList.toggle('performance',!!p.performance);
  document.body.classList.toggle('ui-large',!!p.largeUI);
  els.performanceState.textContent=p.performance?'Bật':'Tắt';
  els.sizeState.textContent=p.largeUI?'Lớn':'Chuẩn';
  els.screensaverState.textContent=p.screensaver?(p.screensaverMinutes+' phút'):'Tắt';
  els.wakeState.textContent=wakeLock?'Bật':(p.wake?'Chờ':'Tắt');
  resetIdle();
}
function togglePerformance(){const p=getPrefs();p.performance=!p.performance;savePrefs(p);showToast(p.performance?'Đã bật chế độ nhẹ':'Đã bật hiệu ứng đầy đủ')}
function toggleSize(){const p=getPrefs();p.largeUI=!p.largeUI;savePrefs(p)}
function cycleScreensaver(){
  const p=getPrefs();
  if(!p.screensaver){p.screensaver=true;p.screensaverMinutes=5}
  else if(p.screensaverMinutes===5)p.screensaverMinutes=8;
  else if(p.screensaverMinutes===8)p.screensaverMinutes=15;
  else p.screensaver=false;
  savePrefs(p);showToast(p.screensaver?'Màn hình chờ sau '+p.screensaverMinutes+' phút':'Đã tắt màn hình chờ');
}

function resetIdle(){
  clearTimeout(idleTimer);
  if(screensaverOn)return;
  const p=getPrefs();
  if(p.screensaver)idleTimer=setTimeout(showScreensaver,p.screensaverMinutes*60*1000);
}
function showScreensaver(){
  if(document.querySelector('dialog[open]'))return resetIdle();
  screensaverOn=true;els.screensaver.classList.add('active');els.screensaver.setAttribute('aria-hidden','false');
  shiftScreensaver();
}
function hideScreensaver(){
  if(!screensaverOn)return false;
  screensaverOn=false;els.screensaver.classList.remove('active');els.screensaver.setAttribute('aria-hidden','true');
  resetIdle();setTimeout(()=>document.querySelector('.tile')?.focus(),0);return true;
}
function shiftScreensaver(){
  if(!screensaverOn)return;
  const points=[[-12,-8],[12,-8],[-12,8],[12,8],[0,0]];
  const p=points[Math.floor(Date.now()/60000)%points.length];
  els.screensaverContent.style.transform='translate('+p[0]+'vw,'+p[1]+'vh)';
}

function showDeviceInfo(){
  const c=navigator.connection||{};
  const data=[
    ['Nền tảng',navigator.platform||'Không xác định'],
    ['Màn hình',screen.width+' × '+screen.height],
    ['Khung trình duyệt',innerWidth+' × '+innerHeight],
    ['Pixel ratio',String(devicePixelRatio||1)],
    ['CPU logic',navigator.hardwareConcurrency?String(navigator.hardwareConcurrency):'Không cung cấp'],
    ['RAM ước tính',navigator.deviceMemory?(navigator.deviceMemory+' GB'):'Không cung cấp'],
    ['Kết nối',c.effectiveType?c.effectiveType.toUpperCase():'Không cung cấp'],
    ['Online',navigator.onLine?'Có':'Không'],
    ['Ngôn ngữ',navigator.language||'vi-VN'],
    ['Phiên bản Hub','V'+VERSION],
    ['Trình duyệt',navigator.userAgent||'Không xác định']
  ];
  els.deviceInfo.innerHTML=data.map(x=>'<div class="info-item"><span>'+escapeHtml(x[0])+'</span><b>'+escapeHtml(x[1])+'</b></div>').join('');
  openDialog(els.infoDialog,els.infoBtn);
}

function openDialog(dialog,from){
  lastFocused=from||document.activeElement;
  dialog.showModal();
  setTimeout(()=>dialog.querySelector('.focusable')?.focus(),0);
}
function closeDialog(dialog){
  if(dialog?.open)dialog.close();
  setTimeout(()=>lastFocused?.focus?.(),0);
}
function closeTopDialog(){
  const open=document.querySelector('dialog[open]');
  if(open){closeDialog(open);return true}
  return false;
}

function showToast(message){
  els.toast.textContent=message;els.toast.classList.add('show');
  clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>els.toast.classList.remove('show'),2200);
}

function getFocusable(){
  const root=document.querySelector('dialog[open]')||document;
  return [...root.querySelectorAll('.focusable:not([disabled])')].filter(el=>!el.classList.contains('hidden')&&(el.offsetParent!==null||el===document.activeElement));
}
function moveFocus(direction){
  const items=getFocusable();if(!items.length)return;
  const current=document.activeElement;
  if(!items.includes(current)){items[0].focus();return}
  const c=current.getBoundingClientRect(),cx=c.left+c.width/2,cy=c.top+c.height/2;
  const horizontal=direction==='left'||direction==='right';
  const candidates=items.filter(el=>el!==current).map(el=>{
    const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,dx=x-cx,dy=y-cy;
    const valid=direction==='left'?dx<-8:direction==='right'?dx>8:direction==='up'?dy<-8:dy>8;
    if(!valid)return null;
    const main=horizontal?Math.abs(dx):Math.abs(dy),cross=horizontal?Math.abs(dy):Math.abs(dx);
    return {el,score:main+cross*2.35};
  }).filter(Boolean).sort((a,b)=>a.score-b.score);
  if(candidates[0]){
    candidates[0].el.focus({preventScroll:false});
    candidates[0].el.scrollIntoView({block:'nearest',inline:'nearest',behavior:getPrefs().performance?'auto':'smooth'});
  }
}
function isTextInput(el){return el&&(['INPUT','TEXTAREA'].includes(el.tagName)||el.isContentEditable)}

els.searchBtn.addEventListener('click',()=>openSearch(els.searchInput.value));
els.searchInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openSearch(els.searchInput.value)}});

els.fullscreenBtn.addEventListener('click',toggleFullscreen);
els.wakeBtn.addEventListener('click',toggleWake);
els.performanceBtn.addEventListener('click',togglePerformance);
els.sizeBtn.addEventListener('click',toggleSize);
els.screensaverBtn.addEventListener('click',cycleScreensaver);
els.infoBtn.addEventListener('click',showDeviceInfo);
els.reloadBtn.addEventListener('click',()=>location.reload());
els.settingsBtn.addEventListener('click',()=>{renderSettings();openDialog(els.settingsDialog,els.settingsBtn)});
els.settingsForm.addEventListener('submit',e=>{e.preventDefault();if(saveSettings())closeDialog(els.settingsDialog)});
els.resetBtn.addEventListener('click',()=>{localStorage.removeItem(TILE_KEY);localStorage.removeItem(OLD_TILE_KEY);renderTiles();renderSettings();showToast('Đã khôi phục 12 ô mặc định')});
document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>closeDialog(b.closest('dialog'))));

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;els.installBtn.classList.remove('hidden')});
els.installBtn.addEventListener('click',async()=>{
  if(!installPrompt)return showToast('Trình duyệt chưa hỗ trợ cài PWA');
  installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;els.installBtn.classList.add('hidden');
});

window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);
document.addEventListener('fullscreenchange',updateFullscreenState);
document.addEventListener('visibilitychange',restoreWake);
setInterval(()=>{updateClock();shiftScreensaver()},1000);

['pointerdown','mousemove','touchstart'].forEach(name=>document.addEventListener(name,()=>{if(!hideScreensaver())resetIdle()},{passive:true}));
document.addEventListener('keydown',e=>{
  if(hideScreensaver()){e.preventDefault();return}
  resetIdle();
  const back=['Escape','BrowserBack','GoBack'].includes(e.key)||e.keyCode===4;
  if(back){
    if(closeTopDialog()){e.preventDefault();return}
    if(isTextInput(document.activeElement)){document.activeElement.blur();e.preventDefault();return}
  }
  const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
  if(map[e.key]){
    if(isTextInput(document.activeElement)&&(e.key==='ArrowLeft'||e.key==='ArrowRight'))return;
    e.preventDefault();moveFocus(map[e.key]);
  }
  if(e.key==='Home'){e.preventDefault();document.querySelector('.tile')?.focus()}
});

if('serviceWorker'in navigator){
  addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').then(reg=>reg.update()).catch(()=>{}));
}

els.versionText.textContent='Xiaomi TV Hub V'+VERSION;
renderTiles();updateClock();updateNetwork();applyPrefs();restoreWake();updateFullscreenState();
setTimeout(()=>document.querySelector('.tile')?.focus(),250);
