(function(){
'use strict';
const $=id=>document.getElementById(id);
let game='',canvas=null,ctx=null,raf=0,last=0,paused=false,keys=new Set(),pressed=new Set(),padPrev={},state=null;
window.tvGameActive=false;

const GAMES=[
  ['snake','🐍 Snake','Ăn mồi, tránh tường'],
  ['pong','🏓 Pong','Đấu CPU'],
  ['breakout','🧱 Breakout','Phá gạch'],
  ['shooter','🚀 Space Shooter','Bắn thiên thạch'],
  ['racer','🏎️ Car Dodge','Né xe'],
  ['flappy','🐦 Flappy','Bay qua cột'],
  ['asteroids','☄️ Asteroids','Xoay, bắn, sinh tồn'],
  ['catcher','🪙 Catch Coins','Hứng đồng xu'],
  ['2048','🔢 2048','Ghép số'],
  ['reaction','⚡ Reaction','Phản xạ tay cầm']
];

window.renderGameApp=function(){
  const root=$('panelBody');
  root.innerHTML='<div class="game-card"><p class="game-menu-note">Logitech F710: nên để công tắc XInput. D-pad/analog di chuyển · A hành động · B thoát game · Start tạm dừng.</p><div class="game-select">'+
    GAMES.map(g=>'<button class="btn game-choice focusable" data-game="'+g[0]+'">'+g[1]+'<small>'+g[2]+'</small></button>').join('')+
    '</div><div class="game-hud"><span id="gameScore">Điểm: 0</span><span id="gameState">Chọn game</span></div><div id="gameStage" class="game-stage"><div class="status">Chọn một game phía trên để bắt đầu.</div></div><div class="game-help">Bàn phím/remote cũng dùng phím mũi tên; Enter/Space tương đương nút A.</div></div>';
  document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>startGame(b.dataset.game));
};
function cleanup(){cancelAnimationFrame(raf);raf=0;last=0;paused=false;keys.clear();pressed.clear();state=null;window.tvGameActive=false}
window.stopActiveGame=cleanup;
function exitGame(){window.tvGameInputLockUntil=performance.now()+550;cleanup();const st=$('gameStage');if(st)st.innerHTML='<div class="status">Đã thoát game. Chọn game khác phía trên.</div>';const gs=$('gameState');if(gs)gs.textContent='Đã thoát game';setTimeout(()=>document.querySelector('[data-game="'+game+'"]')?.focus(),20)}
function setupCanvas(w=960,h=540){const stage=$('gameStage');stage.innerHTML='<canvas id="gameCanvas" width="'+w+'" height="'+h+'"></canvas>';canvas=$('gameCanvas');ctx=canvas.getContext('2d');return canvas}
function firstPad(){const list=navigator.getGamepads?navigator.getGamepads():[];for(const p of list)if(p&&p.connected)return p;return null}
function readPad(){
  const bridge=window.TVInput?.readGamepadState?.();
  let s;
  if(bridge){
    s={x:Number(bridge.x)||0,y:Number(bridge.y)||0,a:!!bridge.a,b:!!bridge.b,start:!!bridge.start,up:!!bridge.up,down:!!bridge.down,left:!!bridge.left,right:!!bridge.right};
  }else{
    const p=firstPad();if(!p)return{x:0,y:0,a:false,b:false,start:false,aEdge:false,bEdge:false,startEdge:false,upEdge:false,downEdge:false,leftEdge:false,rightEdge:false};
    const ax=p.axes||[],btn=p.buttons||[],rawX=Math.abs(ax[0]||0)>.22?(ax[0]||0):0,rawY=Math.abs(ax[1]||0)>.22?(ax[1]||0):0;
    s={x:rawX,y:rawY,a:!!btn[0]?.pressed,b:!!btn[1]?.pressed,start:!!btn[9]?.pressed,up:!!btn[12]?.pressed||rawY<-.55,down:!!btn[13]?.pressed||rawY>.55,left:!!btn[14]?.pressed||rawX<-.55,right:!!btn[15]?.pressed||rawX>.55};
  }
  s.aEdge=s.a&&!padPrev.a;s.bEdge=s.b&&!padPrev.b;s.startEdge=s.start&&!padPrev.start;s.upEdge=s.up&&!padPrev.up;s.downEdge=s.down&&!padPrev.down;s.leftEdge=s.left&&!padPrev.left;s.rightEdge=s.right&&!padPrev.right;padPrev=s;return s;
}
function input(){
  const p=readPad(),x=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),y=(keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0);
  const c={x:Math.abs(p.x)>.2?p.x:x,y:Math.abs(p.y)>.2?p.y:y,a:p.a||keys.has(' ')||keys.has('Enter'),aEdge:p.aEdge||pressed.has(' ')||pressed.has('Enter'),bEdge:p.bEdge,startEdge:p.startEdge,upEdge:p.upEdge||pressed.has('ArrowUp'),downEdge:p.downEdge||pressed.has('ArrowDown'),leftEdge:p.leftEdge||pressed.has('ArrowLeft'),rightEdge:p.rightEdge||pressed.has('ArrowRight')};
  pressed.clear();return c;
}
function bg(){ctx.fillStyle='#050b12';ctx.fillRect(0,0,canvas.width,canvas.height)}
function text(msg,x,y,size=24,align='left'){ctx.fillStyle='#eef5ff';ctx.font='700 '+size+'px Arial';ctx.textAlign=align;ctx.fillText(msg,x,y)}
function loop(update,draw){
  function frame(t){if(!window.tvGameActive)return;const dt=Math.min(.04,(t-last)/1000||.016);last=t;const c=input();if(c.bEdge){exitGame();return}if(c.startEdge){paused=!paused;$('gameState').textContent=paused?'Tạm dừng':'Đang chơi'}if(!paused)update(dt,c);draw(c);raf=requestAnimationFrame(frame)}raf=requestAnimationFrame(frame)
}
function cycleGameNative(delta){const i=Math.max(0,GAMES.findIndex(g=>g[0]===game));startGame(GAMES[(i+delta+GAMES.length)%GAMES.length][0])}
function startGame(name){cleanup();game=name;window.tvGameActive=true;padPrev={};$('gameState').textContent='Đang chơi '+(GAMES.find(g=>g[0]===name)?.[1]||name);$('gameScore').textContent='Điểm: 0';({snake:startSnake,pong:startPong,breakout:startBreakout,shooter:startShooter,racer:startRacer,flappy:startFlappy,asteroids:startAsteroids,catcher:startCatcher,'2048':start2048,reaction:startReaction}[name])?.()}

function startSnake(){
  setupCanvas();const cell=24,cols=40,rows=22;state={body:[{x:10,y:10},{x:9,y:10},{x:8,y:10}],dir:{x:1,y:0},next:{x:1,y:0},food:{x:22,y:10},acc:0,score:0,over:false};
  function newFood(){state.food={x:Math.floor(Math.random()*cols),y:Math.floor(Math.random()*rows)}}
  loop((dt,c)=>{if(state.over){if(c.aEdge)startGame('snake');return}const m=c.upEdge?{x:0,y:-1}:c.downEdge?{x:0,y:1}:c.leftEdge?{x:-1,y:0}:c.rightEdge?{x:1,y:0}:null;if(m&&(m.x!==-state.dir.x||m.y!==-state.dir.y))state.next=m;state.acc+=dt;if(state.acc<.11)return;state.acc=0;state.dir=state.next;const h={x:state.body[0].x+state.dir.x,y:state.body[0].y+state.dir.y};if(h.x<0||h.y<0||h.x>=cols||h.y>=rows||state.body.some(p=>p.x===h.x&&p.y===h.y)){state.over=true;$('gameState').textContent='Game Over · A/Enter chơi lại';return}state.body.unshift(h);if(h.x===state.food.x&&h.y===state.food.y){state.score+=10;$('gameScore').textContent='Điểm: '+state.score;newFood()}else state.body.pop()},()=>{bg();ctx.fillStyle='#ffd84d';ctx.fillRect(state.food.x*cell+3,state.food.y*cell+3,cell-6,cell-6);ctx.fillStyle='#4ee39a';state.body.forEach(p=>ctx.fillRect(p.x*cell+2,p.y*cell+2,cell-4,cell-4));if(state.over)text('GAME OVER',480,270,52,'center')})
}
function startPong(){
  setupCanvas();state={py:220,ai:220,bx:480,by:270,vx:330,vy:190,me:0,cpu:0};
  function reset(dir){state.bx=480;state.by=270;state.vx=330*dir;state.vy=(Math.random()>.5?190:-190)}
  loop((dt,c)=>{state.py=Math.max(0,Math.min(430,state.py+c.y*420*dt));state.ai+=((state.by-55)-state.ai)*Math.min(1,dt*4);state.bx+=state.vx*dt;state.by+=state.vy*dt;if(state.by<8||state.by>532)state.vy*=-1;if(state.bx<42&&state.by>state.py&&state.by<state.py+110){state.vx=Math.abs(state.vx)*1.03}if(state.bx>918&&state.by>state.ai&&state.by<state.ai+110){state.vx=-Math.abs(state.vx)*1.03}if(state.bx<0){state.cpu++;reset(1)}if(state.bx>960){state.me++;reset(-1)}$('gameScore').textContent='Bạn '+state.me+' : '+state.cpu+' CPU'},()=>{bg();ctx.fillStyle='#fff';ctx.fillRect(24,state.py,14,110);ctx.fillRect(922,state.ai,14,110);ctx.beginPath();ctx.arc(state.bx,state.by,10,0,Math.PI*2);ctx.fill()})
}
function startBreakout(){
  setupCanvas();const cols=10,rows=5,bw=86,bh=25;state={px:400,bx:480,by:430,vx:260,vy:-280,score:0,bricks:Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>({x:40+x*88,y:50+y*30,on:true})))};
  loop((dt,c)=>{state.px=Math.max(0,Math.min(800,state.px+c.x*520*dt));state.bx+=state.vx*dt;state.by+=state.vy*dt;if(state.bx<8||state.bx>952)state.vx*=-1;if(state.by<8)state.vy=Math.abs(state.vy);if(state.by>492&&state.by<520&&state.bx>state.px&&state.bx<state.px+160)state.vy=-Math.abs(state.vy);for(const row of state.bricks)for(const b of row)if(b.on&&state.bx>b.x&&state.bx<b.x+bw&&state.by>b.y&&state.by<b.y+bh){b.on=false;state.vy*=-1;state.score+=10;$('gameScore').textContent='Điểm: '+state.score}if(state.by>550){state.bx=480;state.by=430;state.vy=-280}if(state.score===cols*rows*10)$('gameState').textContent='Bạn thắng!'},()=>{bg();ctx.fillStyle='#63dcff';ctx.fillRect(state.px,505,160,18);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(state.bx,state.by,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8d7cff';for(const row of state.bricks)for(const b of row)if(b.on)ctx.fillRect(b.x,b.y,bw,bh)})
}
function startShooter(){
  setupCanvas();state={x:480,y:470,shots:[],rocks:[],spawn:0,score:0};
  loop((dt,c)=>{state.x=Math.max(25,Math.min(935,state.x+c.x*420*dt));state.y=Math.max(280,Math.min(510,state.y+c.y*300*dt));if(c.aEdge)state.shots.push({x:state.x,y:state.y-25});state.spawn-=dt;if(state.spawn<=0){state.spawn=.45+Math.random()*.7;state.rocks.push({x:30+Math.random()*900,y:-20,r:12+Math.random()*18,v:120+Math.random()*130})}state.shots.forEach(s=>s.y-=520*dt);state.rocks.forEach(r=>r.y+=r.v*dt);for(const r of state.rocks)for(const s of state.shots)if(Math.hypot(r.x-s.x,r.y-s.y)<r.r+5){r.dead=s.dead=true;state.score+=10}$('gameScore').textContent='Điểm: '+state.score;state.rocks=state.rocks.filter(r=>!r.dead&&r.y<570);state.shots=state.shots.filter(s=>!s.dead&&s.y>-20);if(state.rocks.some(r=>Math.hypot(r.x-state.x,r.y-state.y)<r.r+18)){state.rocks=[];state.score=Math.max(0,state.score-50);showToast('Trúng thiên thạch!')}},()=>{bg();ctx.fillStyle='#62e3ff';ctx.beginPath();ctx.moveTo(state.x,state.y-22);ctx.lineTo(state.x-18,state.y+18);ctx.lineTo(state.x+18,state.y+18);ctx.fill();ctx.fillStyle='#ffd84d';state.shots.forEach(s=>ctx.fillRect(s.x-3,s.y-10,6,16));ctx.fillStyle='#ff8b77';state.rocks.forEach(r=>{ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.fill()})})
}
function startRacer(){
  setupCanvas();state={lane:2,x:480,obs:[],spawn:0,score:0,speed:220};
  const lanes=[220,350,480,610,740];
  loop((dt,c)=>{if(c.leftEdge)state.lane=Math.max(0,state.lane-1);if(c.rightEdge)state.lane=Math.min(4,state.lane+1);state.x+=(lanes[state.lane]-state.x)*Math.min(1,dt*10);state.spawn-=dt;if(state.spawn<=0){state.spawn=.65;state.obs.push({lane:Math.floor(Math.random()*5),y:-80})}state.obs.forEach(o=>o.y+=state.speed*dt);for(const o of state.obs)if(!o.hit&&o.lane===state.lane&&o.y>420&&o.y<520){o.hit=true;state.score=Math.max(0,state.score-30);showToast('Va chạm!')}state.obs=state.obs.filter(o=>o.y<590);state.score+=dt*5;$('gameScore').textContent='Điểm: '+Math.floor(state.score)},()=>{bg();ctx.strokeStyle='#425066';ctx.lineWidth=3;for(const x of [285,415,545,675]){ctx.setLineDash([24,24]);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,540);ctx.stroke()}ctx.setLineDash([]);ctx.fillStyle='#4ee39a';ctx.fillRect(state.x-28,440,56,80);ctx.fillStyle='#ff7c91';state.obs.forEach(o=>ctx.fillRect(lanes[o.lane]-28,o.y,56,80))})
}
function startFlappy(){
  setupCanvas();state={y:270,vy:0,pipes:[],spawn:0,score:0};
  loop((dt,c)=>{if(c.aEdge)state.vy=-330;state.vy+=850*dt;state.y+=state.vy*dt;state.spawn-=dt;if(state.spawn<=0){state.spawn=1.55;const gapY=130+Math.random()*250;state.pipes.push({x:980,gapY,scored:false})}state.pipes.forEach(p=>p.x-=220*dt);for(const p of state.pipes){if(!p.scored&&p.x<200){p.scored=true;state.score++;$('gameScore').textContent='Điểm: '+state.score}if(p.x<230&&p.x+70>170&&(state.y<p.gapY-85||state.y>p.gapY+85)){state.y=270;state.vy=0;state.score=0;state.pipes=[];showToast('Chạm cột!')}}if(state.y<10||state.y>530){state.y=270;state.vy=0}},()=>{bg();ctx.fillStyle='#ffd84d';ctx.beginPath();ctx.arc(200,state.y,18,0,Math.PI*2);ctx.fill();ctx.fillStyle='#45d08b';state.pipes.forEach(p=>{ctx.fillRect(p.x,0,70,p.gapY-85);ctx.fillRect(p.x,p.gapY+85,70,540-(p.gapY+85))})})
}
function startAsteroids(){
  setupCanvas();state={x:480,y:270,a:-Math.PI/2,vx:0,vy:0,shots:[],rocks:Array.from({length:6},()=>({x:Math.random()*960,y:Math.random()*540,r:18+Math.random()*18,vx:(Math.random()-.5)*90,vy:(Math.random()-.5)*90})),score:0};
  loop((dt,c)=>{state.a+=c.x*3*dt;if(c.y<-.25){state.vx+=Math.cos(state.a)*180*dt;state.vy+=Math.sin(state.a)*180*dt}state.x=(state.x+state.vx*dt+960)%960;state.y=(state.y+state.vy*dt+540)%540;state.vx*=.995;state.vy*=.995;if(c.aEdge)state.shots.push({x:state.x,y:state.y,vx:Math.cos(state.a)*420,vy:Math.sin(state.a)*420,t:1.5});state.shots.forEach(s=>{s.x=(s.x+s.vx*dt+960)%960;s.y=(s.y+s.vy*dt+540)%540;s.t-=dt});state.rocks.forEach(r=>{r.x=(r.x+r.vx*dt+960)%960;r.y=(r.y+r.vy*dt+540)%540});for(const r of state.rocks)for(const s of state.shots)if(!r.dead&&Math.hypot(r.x-s.x,r.y-s.y)<r.r){r.dead=true;s.t=0;state.score+=20}$('gameScore').textContent='Điểm: '+state.score;state.rocks=state.rocks.filter(r=>!r.dead);while(state.rocks.length<6)state.rocks.push({x:Math.random()*960,y:Math.random()*540,r:18+Math.random()*18,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100});state.shots=state.shots.filter(s=>s.t>0)},()=>{bg();ctx.save();ctx.translate(state.x,state.y);ctx.rotate(state.a);ctx.strokeStyle='#62e3ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(-16,-13);ctx.lineTo(-10,0);ctx.lineTo(-16,13);ctx.closePath();ctx.stroke();ctx.restore();ctx.fillStyle='#ffd84d';state.shots.forEach(s=>{ctx.beginPath();ctx.arc(s.x,s.y,3,0,Math.PI*2);ctx.fill()});ctx.strokeStyle='#aaa';state.rocks.forEach(r=>{ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke()})})
}
function startCatcher(){
  setupCanvas();state={x:480,items:[],spawn:0,score:0};
  loop((dt,c)=>{state.x=Math.max(50,Math.min(910,state.x+c.x*520*dt));state.spawn-=dt;if(state.spawn<=0){state.spawn=.45;state.items.push({x:30+Math.random()*900,y:-10,bad:Math.random()<.22,v:150+Math.random()*100})}state.items.forEach(i=>i.y+=i.v*dt);for(const i of state.items)if(!i.done&&i.y>460&&i.y<520&&Math.abs(i.x-state.x)<65){i.done=true;state.score+=i.bad?-10:5}$('gameScore').textContent='Điểm: '+state.score;state.items=state.items.filter(i=>!i.done&&i.y<560)},()=>{bg();ctx.fillStyle='#62e3ff';ctx.fillRect(state.x-60,485,120,20);state.items.forEach(i=>{ctx.fillStyle=i.bad?'#ff7c91':'#ffd84d';ctx.beginPath();ctx.arc(i.x,i.y,12,0,Math.PI*2);ctx.fill()})})
}
function start2048(){
  const stage=$('gameStage');stage.innerHTML='<div id="board2048" class="game-board-2048"></div>';state={b:Array.from({length:4},()=>Array(4).fill(0))};add();add();draw2048();
  function add(){const e=[];for(let y=0;y<4;y++)for(let x=0;x<4;x++)if(!state.b[y][x])e.push([x,y]);if(!e.length)return;const [x,y]=e[Math.floor(Math.random()*e.length)];state.b[y][x]=Math.random()<.9?2:4}
  function comp(a){const x=a.filter(Boolean);for(let i=0;i<x.length-1;i++)if(x[i]===x[i+1]){x[i]*=2;x[i+1]=0;i++}return x.filter(Boolean).concat([0,0,0,0]).slice(0,4)}
  function move(d){const before=JSON.stringify(state.b);if(d==='left')state.b=state.b.map(comp);if(d==='right')state.b=state.b.map(r=>comp([...r].reverse()).reverse());if(d==='up'||d==='down'){const n=Array.from({length:4},()=>Array(4).fill(0));for(let x=0;x<4;x++){let col=[];for(let y=0;y<4;y++)col.push(state.b[y][x]);if(d==='down')col.reverse();col=comp(col);if(d==='down')col.reverse();for(let y=0;y<4;y++)n[y][x]=col[y]}state.b=n}if(JSON.stringify(state.b)!==before){add();draw2048()}}
  function draw2048(){const b=$('board2048');b.innerHTML='';let max=0;for(let y=0;y<4;y++)for(let x=0;x<4;x++){const v=state.b[y][x];max=Math.max(max,v);const d=document.createElement('div');d.className='tile2048';d.textContent=v||'';b.appendChild(d)}$('gameScore').textContent='Ô lớn nhất: '+max}
  function frame(){if(!window.tvGameActive||game!=='2048')return;const c=input();if(c.bEdge){exitGame();return}if(c.leftEdge)move('left');if(c.rightEdge)move('right');if(c.upEdge)move('up');if(c.downEdge)move('down');raf=requestAnimationFrame(frame)}raf=requestAnimationFrame(frame)
}
function startReaction(){
  const stage=$('gameStage');stage.innerHTML='<div id="reactionBox" class="reaction-box">Nhấn A / Enter để bắt đầu</div>';state={phase:'idle',startAt:0,goAt:0,best:null};
  function resetWait(){state.phase='wait';state.goAt=performance.now()+1500+Math.random()*3000;$('reactionBox').textContent='CHỜ…';$('reactionBox').style.background='#7c2b35'}
  function frame(t){if(!window.tvGameActive||game!=='reaction')return;const c=input();if(c.bEdge){exitGame();return}const box=$('reactionBox');if(state.phase==='idle'&&c.aEdge)resetWait();else if(state.phase==='wait'){if(c.aEdge){state.phase='idle';box.textContent='Quá sớm! Nhấn A để thử lại';box.style.background='#53303a'}else if(t>=state.goAt){state.phase='go';state.startAt=t;box.textContent='NHẤN A!';box.style.background='#146c43'}}else if(state.phase==='go'&&c.aEdge){const ms=Math.round(t-state.startAt);state.best=state.best==null?ms:Math.min(state.best,ms);$('gameScore').textContent='Phản xạ: '+ms+' ms · Tốt nhất '+state.best+' ms';state.phase='idle';box.textContent=ms+' ms · Nhấn A để chơi lại';box.style.background='#163d68'}raf=requestAnimationFrame(frame)}raf=requestAnimationFrame(frame)
}

document.addEventListener('keydown',e=>{if(!window.tvGameActive)return;
  const back=['Escape','BrowserBack','GoBack'].includes(e.key)||e.keyCode===4;
  if(back||e.key==='GamepadSelect'){e.preventDefault();exitGame();return}
  if(e.key==='GamepadStart'){e.preventDefault();paused=!paused;const gs=$('gameState');if(gs)gs.textContent=paused?'Tạm dừng':'Đang chơi';return}
  if(e.key==='GamepadX'||e.key==='GamepadL3'){e.preventDefault();startGame(game);return}
  if(e.key==='GamepadY'||e.key==='GamepadR1'||e.key==='GamepadR2'||e.key==='GamepadR3'){e.preventDefault();cycleGameNative(1);return}
  if(e.key==='GamepadL1'||e.key==='GamepadL2'){e.preventDefault();cycleGameNative(-1);return}
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)){e.preventDefault();keys.add(e.key);if(!e.repeat)pressed.add(e.key)}
},true);
document.addEventListener('keyup',e=>{if(window.tvGameActive)keys.delete(e.key)},true);
})();