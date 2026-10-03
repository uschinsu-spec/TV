(function(){
'use strict';

const NAV_ON=.52;
const NAV_OFF=.30;
const NAV_REPEAT=145;
const pressed=Object.create(null);
const axisHeld={left:false,right:false,up:false,down:false};
const axisAt={left:0,right:0,up:0,down:0};
let lastRightScroll=0;
let browserPad='';
let prevLT=false,prevRT=false;

function toast(msg){try{window.showToast?.(msg)}catch(e){}}
function gameActive(){return !!window.tvGameActive}
function panelOpen(){return document.getElementById('appPanel')?.classList.contains('open')}
function focusFirst(selector){document.querySelector(selector)?.focus?.()}

function activate(){
  const el=document.activeElement;
  if(el&&typeof el.click==='function'&&el!==document.body&&el!==document.documentElement){el.click();return}
  focusFirst('.app-card.focusable');
}
function goBack(){
  if(gameActive()){sendGameKey('Escape',true);sendGameKey('Escape',false);return}
  if(panelOpen()){document.getElementById('backBtn')?.click();return}
}
function moveDir(dir){
  if(typeof window.move==='function'){window.move(dir);return}
  const key={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown'}[dir];
  if(key)sendKey(key,true,false);
}
function sendKey(key,down,gameOnly){
  if(gameOnly&&!gameActive())return;
  const type=down?'keydown':'keyup';
  document.dispatchEvent(new KeyboardEvent(type,{key:key,code:key,bubbles:true,cancelable:true}));
}
function sendGameKey(key,down){sendKey(key,down,true)}

function gameKeyFor(name){
  return {
    DPAD_UP:'ArrowUp',DPAD_DOWN:'ArrowDown',DPAD_LEFT:'ArrowLeft',DPAD_RIGHT:'ArrowRight',
    A:'Enter',DPAD_CENTER:'Enter',
    B:'Escape',
    X:'GamepadX',Y:'GamepadY',
    L1:'GamepadL1',R1:'GamepadR1',L2:'GamepadL2',R2:'GamepadR2',
    START:'GamepadStart',SELECT:'GamepadSelect',L3:'GamepadL3',R3:'GamepadR3',
    MODE:'GamepadMode',C:'GamepadC',Z:'GamepadZ'
  }[name]||null;
}

function handleButton(name,down,detail){
  if(!name)return;
  if(down){
    if(pressed[name]&&!detail?.repeat)return;
    pressed[name]=true;
  }else{
    pressed[name]=false;
  }

  if(gameActive()){
    const key=gameKeyFor(name);
    if(key)sendGameKey(key,down);
    return;
  }

  if(!down)return;

  switch(name){
    case 'DPAD_LEFT': moveDir('left'); break;
    case 'DPAD_RIGHT': moveDir('right'); break;
    case 'DPAD_UP': moveDir('up'); break;
    case 'DPAD_DOWN': moveDir('down'); break;
    case 'A':
    case 'DPAD_CENTER':
    case 'START':
      activate(); break;
    case 'B':
      goBack(); break;
    case 'L1':
      window.scrollBy({top:-Math.max(220,innerHeight*.62),behavior:'auto'}); break;
    case 'R1':
      window.scrollBy({top:Math.max(220,innerHeight*.62),behavior:'auto'}); break;
    case 'L2':
      moveDir('left'); break;
    case 'R2':
      moveDir('right'); break;
    case 'SELECT':
      focusFirst('.sys-btn.focusable'); break;
    case 'L3':
      focusFirst('.app-card.focusable'); break;
    case 'R3':
      focusFirst('.sys-btn.focusable'); break;
    case 'X':
    case 'Y':
    case 'MODE':
    case 'C':
    case 'Z':
      toast('Tay cầm: '+name); break;
    default:
      if(name.indexOf('BUTTON_')===0)toast('Tay cầm: '+name);
  }
}

function axisPulse(dir,on){
  const now=performance.now();
  if(!on){axisHeld[dir]=false;return}
  if(!axisHeld[dir]||now-axisAt[dir]>=NAV_REPEAT){
    axisHeld[dir]=true;
    axisAt[dir]=now;
    if(gameActive()){
      const key={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown'}[dir];
      sendGameKey(key,true);
      setTimeout(()=>sendGameKey(key,false),28);
    }else moveDir(dir);
  }
}
function handleAxes(d){
  let x=Math.abs(Number(d.hatX)||0)>Math.abs(Number(d.lx)||0)?Number(d.hatX)||0:Number(d.lx)||0;
  let y=Math.abs(Number(d.hatY)||0)>Math.abs(Number(d.ly)||0)?Number(d.hatY)||0:Number(d.ly)||0;

  axisPulse('left',x<=-NAV_ON);
  axisPulse('right',x>=NAV_ON);
  axisPulse('up',y<=-NAV_ON);
  axisPulse('down',y>=NAV_ON);

  if(Math.abs(x)<NAV_OFF){axisHeld.left=false;axisHeld.right=false}
  if(Math.abs(y)<NAV_OFF){axisHeld.up=false;axisHeld.down=false}

  if(!gameActive()){
    const ry=Number(d.ry)||0,now=performance.now();
    if(Math.abs(ry)>.56&&now-lastRightScroll>75){
      lastRightScroll=now;
      window.scrollBy({top:ry*Math.max(80,innerHeight*.14),behavior:'auto'});
    }
  }

  const lt=(Number(d.lt)||0)>.55,rt=(Number(d.rt)||0)>.55;
  if(lt!==prevLT){prevLT=lt;handleButton('L2',lt,d)}
  if(rt!==prevRT){prevRT=rt;handleButton('R2',rt,d)}
}

window.addEventListener('tvgamepad',e=>{
  const d=e.detail||{};
  if(d.device)window.__lastTVGamepadDevice=d.device;
  if(d.kind==='button')handleButton(d.name,d.action==='down',d);
  if(d.kind==='axes')handleAxes(d);
});

window.addEventListener('gamepadconnected',e=>{
  browserPad=e.gamepad?.id||'Gamepad';
  toast('Đã nhận tay cầm: '+browserPad.slice(0,50));
});
window.addEventListener('gamepaddisconnected',()=>toast('Tay cầm đã ngắt kết nối'));

const standardNames=['A','B','X','Y','L1','R1','L2','R2','SELECT','START','L3','R3','DPAD_UP','DPAD_DOWN','DPAD_LEFT','DPAD_RIGHT','MODE'];
const browserPressed=[];

function pollBrowserGamepad(){
  if(!window.__TV_NATIVE_GAMEPAD__&&navigator.getGamepads){
    const gp=Array.from(navigator.getGamepads()||[]).find(Boolean);
    if(gp){
      browserPad=gp.id||browserPad;
      const a=gp.axes||[];
      handleAxes({lx:a[0]||0,ly:a[1]||0,rx:a[2]||0,ry:a[3]||0,hatX:0,hatY:0,lt:gp.buttons?.[6]?.value||0,rt:gp.buttons?.[7]?.value||0});
      const buttons=gp.buttons||[];
      for(let i=0;i<buttons.length;i++){
        const down=!!buttons[i]?.pressed;
        if(down!==!!browserPressed[i]){
          browserPressed[i]=down;
          handleButton(standardNames[i]||('BUTTON_'+(i+1)),down,{source:'browser'});
        }
      }
    }
  }
  requestAnimationFrame(pollBrowserGamepad);
}
requestAnimationFrame(pollBrowserGamepad);

window.TVInput={
  get native(){return !!window.__TV_NATIVE_GAMEPAD__},
  get device(){return window.__lastTVGamepadDevice||browserPad||''},
  mapping:{
    dpad:'Điều hướng',leftStick:'Điều hướng/game',rightStick:'Cuộn',
    A:'OK',B:'Back',L1:'Page Up',R1:'Page Down',L2:'Trái',R2:'Phải',
    Start:'OK',Select:'Thanh hệ thống',L3:'Ứng dụng đầu',R3:'Thanh hệ thống'
  }
};
})();