(function(){
'use strict';

window.__TV_INPUT_BRIDGE_READY__=true;
window.__tvLastNativeInputAt=window.__tvLastNativeInputAt||0;

const NAV_ON=.52;
const NAV_OFF=.30;
const NAV_REPEAT=145;
const pressed=Object.create(null);
const axisHeld={left:false,right:false,up:false,down:false};
const axisAt={left:0,right:0,up:0,down:0};
const browserPressed=[];
const standardNames=['A','B','X','Y','L1','R1','L2','R2','SELECT','START','L3','R3','DPAD_UP','DPAD_DOWN','DPAD_LEFT','DPAD_RIGHT','MODE'];
const nativeState={
  lx:0,ly:0,rx:0,ry:0,hatX:0,hatY:0,lt:0,rt:0,
  buttons:Object.create(null),device:'',updatedAt:0
};
let lastRightScroll=0;
let browserPad='';
let prevLT=false,prevRT=false;
let gameMode=false;
const directPressSeen={a:0,b:0,x:0,y:0,start:0};

function now(){return performance.now()}
function nativeRecent(){return now()-(nativeState.updatedAt||0)<420}
function nativeAvailable(){
  return !!(window.__TV_NATIVE_APP_VERSION__||window.__TV_NATIVE_GAMEPAD__||nativeState.device||window.__lastTVGamepadDevice);
}
function toast(msg){try{window.showToast?.(msg)}catch(e){}}
function gameActive(){return !!window.tvGameActive}
function panelOpen(){return document.getElementById('appPanel')?.classList.contains('open')}
function focusFirst(selector){document.querySelector(selector)?.focus?.()}
function activeBrowserPad(){
  if(!navigator.getGamepads)return null;
  return Array.from(navigator.getGamepads()||[]).find(p=>p&&p.connected)||null;
}
function dominant(a,b){return Math.abs(a)>=Math.abs(b)?a:b}

function setStatus(label,action){
  const el=document.getElementById('gamepadStatus');if(!el)return;
  el.textContent='🎮 '+label+(action?' · '+action:'');
  el.classList.add('connected');
}
function noteNative(d){
  const t=now();
  window.__tvLastNativeInputAt=t;
  nativeState.updatedAt=t;
  nativeState.device=d?.device||nativeState.device||window.__lastTVGamepadDevice||'Gamepad';
  if(d?.device)window.__lastTVGamepadDevice=d.device;
  if(d?.kind==='axes'){
    for(const k of ['lx','ly','rx','ry','hatX','hatY','lt','rt'])nativeState[k]=Number(d[k])||0;
  }
  if(d?.kind==='button'&&d.name)nativeState.buttons[d.name]=d.action==='down';
  const action=d?.kind==='button'?(d.name+' '+String(d.action||'').toUpperCase()):'ANALOG';
  if(!gameActive()&&!gameMode)setStatus(nativeState.device,action);
}

function activate(){
  const el=document.activeElement;
  if(el&&typeof el.click==='function'&&el!==document.body&&el!==document.documentElement){el.click();return}
  focusFirst('.app-card.focusable');
}
function goBack(){
  if(panelOpen()){document.getElementById('backBtn')?.click();return}
}
function moveDir(dir){
  if(typeof window.move==='function'){window.move(dir);return}
  const key={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown'}[dir];
  if(key)document.dispatchEvent(new KeyboardEvent('keydown',{key,code:key,bubbles:true,cancelable:true}));
}
function handleButton(name,down,detail){
  if(!name)return;
  if(down){
    if(pressed[name]&&!detail?.repeat)return;
    pressed[name]=true;
  }else pressed[name]=false;

  // Games read TVInput state directly. Do not synthesize duplicate game keys here.
  if(gameActive())return;
  if(!down)return;

  switch(name){
    case 'DPAD_LEFT': moveDir('left'); break;
    case 'DPAD_RIGHT': moveDir('right'); break;
    case 'DPAD_UP': moveDir('up'); break;
    case 'DPAD_DOWN': moveDir('down'); break;
    case 'A':
    case 'DPAD_CENTER':
    case 'START': activate(); break;
    case 'B': goBack(); break;
    case 'L1': window.scrollBy({top:-Math.max(220,innerHeight*.62),behavior:'auto'}); break;
    case 'R1': window.scrollBy({top:Math.max(220,innerHeight*.62),behavior:'auto'}); break;
    case 'L2': moveDir('left'); break;
    case 'R2': moveDir('right'); break;
    case 'SELECT': focusFirst('.sys-btn.focusable'); break;
    case 'L3': focusFirst('.app-card.focusable'); break;
    case 'R3': focusFirst('.sys-btn.focusable'); break;
    default: break;
  }
}
function axisPulse(dir,on){
  const t=now();
  if(!on){axisHeld[dir]=false;return}
  if(!axisHeld[dir]||t-axisAt[dir]>=NAV_REPEAT){
    axisHeld[dir]=true;axisAt[dir]=t;
    if(!gameActive())moveDir(dir);
  }
}
function handleAxes(d){
  if(gameActive())return;
  const x=dominant(Number(d.hatX)||0,Number(d.lx)||0);
  const y=dominant(Number(d.hatY)||0,Number(d.ly)||0);
  axisPulse('left',x<=-NAV_ON);
  axisPulse('right',x>=NAV_ON);
  axisPulse('up',y<=-NAV_ON);
  axisPulse('down',y>=NAV_ON);
  if(Math.abs(x)<NAV_OFF){axisHeld.left=false;axisHeld.right=false}
  if(Math.abs(y)<NAV_OFF){axisHeld.up=false;axisHeld.down=false}
  const ry=Number(d.ry)||0,t=now();
  if(Math.abs(ry)>.56&&t-lastRightScroll>75){
    lastRightScroll=t;
    window.scrollBy({top:ry*Math.max(80,innerHeight*.14),behavior:'auto'});
  }
  const lt=(Number(d.lt)||0)>.55,rt=(Number(d.rt)||0)>.55;
  if(lt!==prevLT){prevLT=lt;handleButton('L2',lt,d)}
  if(rt!==prevRT){prevRT=rt;handleButton('R2',rt,d)}
}

window.addEventListener('tvgamepad',e=>{
  const d=e.detail||{};
  noteNative(d);
  if(d.kind==='button')handleButton(d.name,d.action==='down',d);
  if(d.kind==='axes')handleAxes(d);
});

window.addEventListener('gamepadconnected',e=>{
  browserPad=e.gamepad?.id||'Gamepad';
  if(!nativeRecent())setStatus(browserPad,'BROWSER API');
});
window.addEventListener('gamepaddisconnected',()=>{
  browserPad='';
  if(!nativeRecent()){
    const el=document.getElementById('gamepadStatus');
    if(el){el.textContent='🎮 Chưa thấy tay cầm';el.classList.remove('connected')}
  }
});

function browserSnapshot(gp){
  if(!gp)return null;
  const a=gp.axes||[],b=gp.buttons||[];
  return {
    lx:Number(a[0])||0,ly:Number(a[1])||0,rx:Number(a[2])||0,ry:Number(a[3])||0,
    hatX:0,hatY:0,lt:Number(b[6]?.value)||0,rt:Number(b[7]?.value)||0,
    buttons:{
      A:!!b[0]?.pressed,B:!!b[1]?.pressed,X:!!b[2]?.pressed,Y:!!b[3]?.pressed,
      L1:!!b[4]?.pressed,R1:!!b[5]?.pressed,L2:!!b[6]?.pressed,R2:!!b[7]?.pressed,
      SELECT:!!b[8]?.pressed,START:!!b[9]?.pressed,L3:!!b[10]?.pressed,R3:!!b[11]?.pressed,
      DPAD_UP:!!b[12]?.pressed,DPAD_DOWN:!!b[13]?.pressed,DPAD_LEFT:!!b[14]?.pressed,DPAD_RIGHT:!!b[15]?.pressed,
      MODE:!!b[16]?.pressed
    },
    device:gp.id||'Gamepad',source:'browser'
  };
}
function directNativeSnapshot(){
  if(!gameMode||!window.TVNativeInput)return null;
  try{
    if(window.TVNativeInput.readPacked){
      const raw=window.TVNativeInput.readPacked();
      if(!raw)return null;
      const v=raw.split('|');
      if(v.length<14)return null;
      const lx=Number(v[0])||0,ly=Number(v[1])||0,rx=Number(v[2])||0,ry=Number(v[3])||0;
      const hatX=Number(v[4])||0,hatY=Number(v[5])||0,lt=Number(v[6])||0,rt=Number(v[7])||0;
      const mask=Number(v[8])|0;
      const aSeq=Number(v[9])||0,bSeq=Number(v[10])||0,xSeq=Number(v[11])||0,ySeq=Number(v[12])||0,startSeq=Number(v[13])||0;
      const aEdgeNative=aSeq!==directPressSeen.a;
      const bEdgeNative=bSeq!==directPressSeen.b;
      const xEdgeNative=xSeq!==directPressSeen.x;
      const yEdgeNative=ySeq!==directPressSeen.y;
      const startEdgeNative=startSeq!==directPressSeen.start;
      directPressSeen.a=aSeq;directPressSeen.b=bSeq;directPressSeen.x=xSeq;directPressSeen.y=ySeq;directPressSeen.start=startSeq;
      return {
        x:Math.abs(hatX)>=Math.abs(lx)?hatX:lx,
        y:Math.abs(hatY)>=Math.abs(ly)?hatY:ly,
        rx,ry,lt,rt,
        a:!!(mask&1)||!!(mask&65536),b:!!(mask&2),xButton:!!(mask&4),yButton:!!(mask&8),
        l1:!!(mask&16),r1:!!(mask&32),l2:!!(mask&64),r2:!!(mask&128),
        select:!!(mask&256),start:!!(mask&512),
        up:!!(mask&4096),down:!!(mask&8192),left:!!(mask&16384),right:!!(mask&32768),
        aEdgeNative,bEdgeNative,xEdgeNative,yEdgeNative,startEdgeNative,
        device:window.__lastTVGamepadDevice||'Native Gamepad',
        source:'native-packed'
      };
    }

    if(!window.TVNativeInput.readState)return null;
    const raw=window.TVNativeInput.readState();
    if(!raw)return null;
    const d=JSON.parse(raw);
    return {
      x:Math.abs(Number(d.hatX)||0)>=Math.abs(Number(d.lx)||0)?Number(d.hatX)||0:Number(d.lx)||0,
      y:Math.abs(Number(d.hatY)||0)>=Math.abs(Number(d.ly)||0)?Number(d.hatY)||0:Number(d.ly)||0,
      rx:Number(d.rx)||0,ry:Number(d.ry)||0,lt:Number(d.lt)||0,rt:Number(d.rt)||0,
      a:!!d.a||!!d.dpadCenter,b:!!d.b,start:!!d.start,select:!!d.select,
      up:!!d.up,down:!!d.down,left:!!d.left,right:!!d.right,
      xButton:!!d.xButton,yButton:!!d.yButton,l1:!!d.l1,r1:!!d.r1,l2:!!d.l2,r2:!!d.r2,
      device:window.__lastTVGamepadDevice||'Native Gamepad',
      source:'native-direct'
    };
  }catch(e){return null}
}

function normalizedState(){
  const direct=directNativeSnapshot();
  if(direct)return direct;
  let s;
  // Inside Android APK game mode, keep using cached native state even while sticks are centered.
  // This prevents navigator.getGamepads() from being called every animation frame.
  if(nativeRecent()||(gameMode&&nativeAvailable())){
    s={
      lx:nativeState.lx,ly:nativeState.ly,rx:nativeState.rx,ry:nativeState.ry,
      hatX:nativeState.hatX,hatY:nativeState.hatY,lt:nativeState.lt,rt:nativeState.rt,
      buttons:nativeState.buttons,device:nativeState.device||window.__lastTVGamepadDevice||'Native Gamepad',source:'native'
    };
  }else{
    s=browserSnapshot(activeBrowserPad());
    if(!s)return null;
  }
  const x=dominant(Number(s.hatX)||0,Number(s.lx)||0);
  const y=dominant(Number(s.hatY)||0,Number(s.ly)||0);
  const b=s.buttons||{};
  return {
    x,y,rx:Number(s.rx)||0,ry:Number(s.ry)||0,lt:Number(s.lt)||0,rt:Number(s.rt)||0,
    a:!!b.A||!!b.DPAD_CENTER,b:!!b.B,start:!!b.START,select:!!b.SELECT,
    up:!!b.DPAD_UP||y<=-NAV_ON,down:!!b.DPAD_DOWN||y>=NAV_ON,
    left:!!b.DPAD_LEFT||x<=-NAV_ON,right:!!b.DPAD_RIGHT||x>=NAV_ON,
    xButton:!!b.X,yButton:!!b.Y,l1:!!b.L1,r1:!!b.R1,l2:!!b.L2,r2:!!b.R2,
    device:s.device||'',source:s.source||''
  };
}

function pollBrowserGamepad(){
  const allowBrowserFallback=!(gameMode&&nativeAvailable());
  const gp=allowBrowserFallback?activeBrowserPad():null;
  if(gp&&!nativeRecent()&&!gameActive()){
    browserPad=gp.id||browserPad;
    setStatus(browserPad,'BROWSER FALLBACK');
    const snap=browserSnapshot(gp);
    handleAxes(snap);
    const buttons=gp.buttons||[];
    for(let i=0;i<buttons.length;i++){
      const down=!!buttons[i]?.pressed;
      if(down!==!!browserPressed[i]){
        browserPressed[i]=down;
        handleButton(standardNames[i]||('BUTTON_'+(i+1)),down,{source:'browser'});
      }
    }
  }
  // Menus do not need 60 FPS input scanning. 100 ms is responsive enough for TV navigation.
  setTimeout(pollBrowserGamepad,gameMode&&nativeAvailable()?2000:(gameActive()?250:(gp?100:350)));
}
setTimeout(pollBrowserGamepad,150);

window.TVInput={
  get native(){return nativeRecent()||(gameMode&&nativeAvailable())},
  get device(){return nativeState.device||browserPad||window.__lastTVGamepadDevice||''},
  get gameMode(){return gameMode},
  setGameMode(on){
    gameMode=!!on;
    directPressSeen.a=directPressSeen.b=directPressSeen.x=directPressSeen.y=directPressSeen.start=0;
    try{window.TVNativeInput?.setLowLatencyMode?.(gameMode)}catch(e){}
    if(gameMode&&nativeAvailable()){
      setStatus(nativeState.device||window.__lastTVGamepadDevice||'Native Gamepad','GAME MODE 60HZ ULTRA');
    }
  },
  readGamepadState:normalizedState
};
})();