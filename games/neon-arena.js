(function(){
'use strict';

window.CustomTVGames=window.CustomTVGames||{};

const W=1280,H=720,FPS=30,FRAME=1000/FPS;
let canvas=null,ctx=null,raf=0,lastFrame=0,lastTick=0,running=false,paused=false;
let state=null,onExit=null;
const keys=new Set(),pressed=new Set();
let padPrev={};

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function rand(min,max){return min+Math.random()*(max-min)}
function len(x,y){return Math.hypot(x,y)}
function norm(x,y){const l=Math.hypot(x,y)||1;return{x:x/l,y:y/l}}
function circleHit(a,b,r){const dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy<r*r}
function edge(now,cur,key){return !!cur[key]&&!padPrev[key]}

function readInput(){
  const p=window.TVInput?.readGamepadState?.()||{};
  const left=(p.left?1:0),right=(p.right?1:0),up=(p.up?1:0),down=(p.down?1:0);
  let x=Math.abs(Number(p.x)||0)>.16?Number(p.x):right-left;
  let y=Math.abs(Number(p.y)||0)>.16?Number(p.y):down-up;
  if(keys.has('ArrowLeft'))x=-1;
  if(keys.has('ArrowRight'))x=1;
  if(keys.has('ArrowUp'))y=-1;
  if(keys.has('ArrowDown'))y=1;
  const m=Math.hypot(x,y);if(m>1){x/=m;y/=m}

  const cur={
    a:!!p.a||keys.has('Enter')||keys.has(' '),
    b:!!p.b||keys.has('Escape'),
    start:!!p.start||keys.has('p'),
    xButton:!!p.xButton||keys.has('x'),
    yButton:!!p.yButton||keys.has('y'),
    r2:!!p.r2||(Number(p.rt)||0)>.45,
    x,y,
    rx:Number(p.rx)||0,
    ry:Number(p.ry)||0
  };
  cur.bEdge=edge(performance.now(),cur,'b')||pressed.has('Escape');
  cur.startEdge=edge(performance.now(),cur,'start')||pressed.has('p');
  cur.xEdge=edge(performance.now(),cur,'xButton')||pressed.has('x');
  cur.yEdge=edge(performance.now(),cur,'yButton')||pressed.has('y');
  cur.aEdge=edge(performance.now(),cur,'a')||pressed.has('Enter')||pressed.has(' ');
  padPrev={...cur};
  pressed.clear();
  return cur;
}

function reset(){
  state={
    t:0,score:0,wave:1,kills:0,spawnTimer:.6,flash:0,shake:0,over:false,
    player:{x:W/2,y:H/2,r:18,hp:100,maxHp:100,speed:285,aimX:1,aimY:0,fireCd:0,dashCd:0,inv:0,bombs:2},
    bullets:[],enemies:[],particles:[],pickups:[],
    stars:Array.from({length:70},()=>({x:Math.random()*W,y:Math.random()*H,s:rand(.5,1.8),a:rand(.16,.52)}))
  };
  paused=false;padPrev={};
  updateHud();
}

function enemyForWave(){
  const w=state.wave;
  const roll=Math.random();
  if(w>=4&&roll>.82)return{type:'tank',r:28,hp:5,speed:52,damage:24,value:50};
  if(w>=2&&roll>.55)return{type:'runner',r:13,hp:1,speed:128+Math.min(50,w*4),damage:12,value:20};
  return{type:'drone',r:18,hp:2,speed:78+Math.min(45,w*3),damage:16,value:30};
}

function spawnEnemy(){
  const e=enemyForWave(),side=Math.floor(Math.random()*4),pad=45;
  if(side===0){e.x=-pad;e.y=rand(40,H-40)}
  if(side===1){e.x=W+pad;e.y=rand(40,H-40)}
  if(side===2){e.x=rand(40,W-40);e.y=-pad}
  if(side===3){e.x=rand(40,W-40);e.y=H+pad}
  state.enemies.push(e);
}

function shoot(p){
  if(p.fireCd>0)return;
  p.fireCd=.12;
  const spread=.025;
  const a=Math.atan2(p.aimY,p.aimX)+rand(-spread,spread);
  const vx=Math.cos(a)*720,vy=Math.sin(a)*720;
  state.bullets.push({x:p.x+p.aimX*24,y:p.y+p.aimY*24,vx,vy,r:5,life:1.2});
}

function dash(p,input){
  if(p.dashCd>0)return;
  let dx=input.x,dy=input.y;
  if(Math.hypot(dx,dy)<.15){dx=p.aimX;dy=p.aimY}
  const n=norm(dx,dy);
  p.x=clamp(p.x+n.x*115,25,W-25);
  p.y=clamp(p.y+n.y*115,25,H-25);
  p.dashCd=1.15;p.inv=.22;state.shake=7;
  burst(p.x,p.y,14,'#65f6ff');
}

function bomb(p){
  if(p.bombs<=0)return;
  p.bombs--;state.flash=.16;state.shake=12;
  for(const e of state.enemies){
    const d=Math.hypot(e.x-p.x,e.y-p.y);
    if(d<300){e.hp-=4;const n=norm(e.x-p.x,e.y-p.y);e.x+=n.x*60;e.y+=n.y*60}
  }
  burst(p.x,p.y,40,'#ffe65a');
}

function burst(x,y,count,color){
  for(let i=0;i<count&&state.particles.length<120;i++){
    const a=Math.random()*Math.PI*2,s=rand(40,240);
    state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.18,.6),max:.6,color,size:rand(2,5)});
  }
}

function damagePlayer(p,amount){
  if(p.inv>0||state.over)return;
  p.hp=Math.max(0,p.hp-amount);p.inv=.7;state.flash=.1;state.shake=10;
  burst(p.x,p.y,18,'#ff557a');
  if(p.hp<=0){state.over=true;paused=false;burst(p.x,p.y,55,'#ff335f')}
}

function update(dt,input){
  if(!state||state.over)return;
  const p=state.player;
  state.t+=dt;
  state.wave=1+Math.floor(state.t/20);
  state.flash=Math.max(0,state.flash-dt);state.shake=Math.max(0,state.shake-dt*24);
  p.fireCd=Math.max(0,p.fireCd-dt);p.dashCd=Math.max(0,p.dashCd-dt);p.inv=Math.max(0,p.inv-dt);

  p.x=clamp(p.x+input.x*p.speed*dt,24,W-24);
  p.y=clamp(p.y+input.y*p.speed*dt,24,H-24);

  const aimMag=Math.hypot(input.rx,input.ry);
  if(aimMag>.24){p.aimX=input.rx/aimMag;p.aimY=input.ry/aimMag}
  else if(Math.hypot(input.x,input.y)>.18){p.aimX=input.x;p.aimY=input.y}

  if(input.a||input.r2)shoot(p);
  if(input.xEdge)dash(p,input);
  if(input.yEdge)bomb(p);

  state.spawnTimer-=dt;
  const maxEnemies=Math.min(34,8+state.wave*3);
  if(state.spawnTimer<=0&&state.enemies.length<maxEnemies){
    spawnEnemy();
    state.spawnTimer=Math.max(.18,.72-state.wave*.045)*rand(.75,1.2);
  }

  for(const b of state.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt}
  for(const e of state.enemies){
    const n=norm(p.x-e.x,p.y-e.y);e.x+=n.x*e.speed*dt;e.y+=n.y*e.speed*dt;
  }

  for(const b of state.bullets){
    if(b.life<=0)continue;
    for(const e of state.enemies){
      if(e.hp<=0)continue;
      if(circleHit(b,e,b.r+e.r)){b.life=0;e.hp--;burst(b.x,b.y,4,'#62efff');break}
    }
  }

  for(const e of state.enemies){
    if(e.hp<=0)continue;
    if(circleHit(p,e,p.r+e.r)){damagePlayer(p,e.damage);const n=norm(e.x-p.x,e.y-p.y);e.x+=n.x*55;e.y+=n.y*55}
  }

  for(const e of state.enemies){
    if(e.hp<=0&&!e.dead){
      e.dead=true;state.kills++;state.score+=e.value*state.wave;
      burst(e.x,e.y,e.type==='tank'?20:10,e.type==='runner'?'#ffbd55':'#b36cff');
      if(Math.random()<.055)state.pickups.push({x:e.x,y:e.y,r:10,type:Math.random()<.7?'heal':'bomb',life:8});
    }
  }

  for(const q of state.pickups){
    q.life-=dt;
    if(circleHit(p,q,p.r+q.r)){
      q.life=0;
      if(q.type==='heal')p.hp=Math.min(p.maxHp,p.hp+24);else p.bombs=Math.min(5,p.bombs+1);
      burst(q.x,q.y,12,q.type==='heal'?'#59f6a6':'#ffe65a');
    }
  }

  for(const pt of state.particles){pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vx*=.95;pt.vy*=.95;pt.life-=dt}

  state.bullets=state.bullets.filter(b=>b.life>0&&b.x>-30&&b.x<W+30&&b.y>-30&&b.y<H+30);
  state.enemies=state.enemies.filter(e=>!e.dead);
  state.pickups=state.pickups.filter(q=>q.life>0);
  state.particles=state.particles.filter(pt=>pt.life>0);
  updateHud();
}

function roundedRect(x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}

function draw(){
  if(!ctx||!state)return;
  const s=state.shake,ox=s?rand(-s,s):0,oy=s?rand(-s,s):0;
  ctx.save();ctx.translate(ox,oy);

  const grad=ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#07101e');grad.addColorStop(1,'#02060c');
  ctx.fillStyle=grad;ctx.fillRect(-20,-20,W+40,H+40);

  ctx.strokeStyle='rgba(83,140,198,.11)';ctx.lineWidth=1;
  const grid=56,scroll=(state.t*16)%grid;
  for(let x=-grid+scroll;x<W+grid;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  for(let y=-grid+scroll;y<H+grid;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}

  for(const st of state.stars){ctx.globalAlpha=st.a;ctx.fillStyle='#b7ddff';ctx.fillRect(st.x,st.y,st.s,st.s)}
  ctx.globalAlpha=1;

  // Arena border
  ctx.strokeStyle='rgba(83,224,255,.36)';ctx.lineWidth=3;roundedRect(16,16,W-32,H-32,28);ctx.stroke();

  for(const q of state.pickups){
    ctx.save();ctx.translate(q.x,q.y);ctx.rotate(state.t*2);
    ctx.fillStyle=q.type==='heal'?'#56efa2':'#ffe158';
    if(q.type==='heal'){ctx.fillRect(-4,-12,8,24);ctx.fillRect(-12,-4,24,8)}
    else{ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.stroke()}
    ctx.restore();
  }

  for(const b of state.bullets){
    ctx.fillStyle='#6df7ff';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();
  }

  for(const e of state.enemies){
    ctx.save();ctx.translate(e.x,e.y);
    if(e.type==='runner'){
      ctx.fillStyle='#ffb14a';ctx.rotate(Math.atan2(state.player.y-e.y,state.player.x-e.x));
      ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(-11,-10);ctx.lineTo(-6,0);ctx.lineTo(-11,10);ctx.closePath();ctx.fill();
    }else if(e.type==='tank'){
      ctx.fillStyle='#e84f78';ctx.rotate(state.t*.55);ctx.fillRect(-22,-22,44,44);
      ctx.fillStyle='#3c1425';ctx.fillRect(-10,-10,20,20);
    }else{
      ctx.fillStyle='#a76bff';ctx.beginPath();ctx.arc(0,0,e.r,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#24133f';ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  for(const pt of state.particles){
    ctx.globalAlpha=clamp(pt.life/pt.max,0,1);ctx.fillStyle=pt.color;
    ctx.fillRect(pt.x-pt.size/2,pt.y-pt.size/2,pt.size,pt.size);
  }
  ctx.globalAlpha=1;

  const p=state.player;
  if(p.inv<=0||Math.floor(state.t*18)%2===0){
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.aimY,p.aimX));
    ctx.fillStyle='#55e9ff';ctx.beginPath();ctx.moveTo(24,0);ctx.lineTo(-13,-15);ctx.lineTo(-7,0);ctx.lineTo(-13,15);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(3,0,5,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  if(state.flash>0){ctx.fillStyle='rgba(255,255,255,'+Math.min(.24,state.flash*1.4)+')';ctx.fillRect(0,0,W,H)}
  if(paused)drawOverlay('TẠM DỪNG','START để tiếp tục · B để thoát');
  if(state.over)drawOverlay('GAME OVER','Điểm '+Math.floor(state.score)+' · A để chơi lại · B để thoát');
}

function drawOverlay(title,sub){
  ctx.fillStyle='rgba(2,6,12,.76)';ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 64px Arial';ctx.fillText(title,W/2,H/2-28);
  ctx.fillStyle='#9ec4de';ctx.font='700 24px Arial';ctx.fillText(sub,W/2,H/2+28);ctx.textAlign='left';
}

function updateHud(){
  if(!state)return;
  const p=state.player;
  const score=document.getElementById('naScore'),wave=document.getElementById('naWave'),bombs=document.getElementById('naBombs'),hp=document.getElementById('naHpFill');
  if(score)score.textContent=String(Math.floor(state.score)).padStart(6,'0');
  if(wave)wave.textContent='WAVE '+state.wave;
  if(bombs)bombs.textContent='Y BOM '+p.bombs;
  if(hp)hp.style.width=Math.max(0,p.hp/p.maxHp*100)+'%';
}

function frame(t){
  if(!running)return;
  raf=requestAnimationFrame(frame);
  if(t-lastFrame<FRAME)return;
  const dt=Math.min(.05,(t-(lastTick||t))/1000||1/FPS);lastFrame=t;lastTick=t;
  const input=readInput();
  if(input.bEdge){stop();onExit?.();return}
  if(state?.over){
    if(input.aEdge)reset();
    draw();return;
  }
  if(input.startEdge)paused=!paused;
  if(!paused)update(dt,input);
  draw();
}

function keyDown(e){
  if(!running)return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' ','Escape','x','y','p'].includes(e.key)){
    e.preventDefault();keys.add(e.key);if(!e.repeat)pressed.add(e.key);
  }
}
function keyUp(e){if(running)keys.delete(e.key)}

function start(opts={}){
  stop();
  onExit=typeof opts.onExit==='function'?opts.onExit:null;
  const root=opts.root||document.getElementById('panelBody');if(!root)return;
  root.innerHTML='<div class="na-game">'+
    '<div class="na-hud">'+
      '<div class="na-brand"><b>NEON ARENA</b><span>SURVIVAL</span></div>'+
      '<div class="na-stat"><span>ĐIỂM</span><b id="naScore">000000</b></div>'+
      '<div class="na-stat"><span id="naWave">WAVE 1</span><b id="naBombs">Y BOM 2</b></div>'+
      '<div class="na-hp"><span>HP</span><div><i id="naHpFill"></i></div></div>'+
      '<div class="na-controls">L: DI CHUYỂN · R: NGẮM · A/R2: BẮN · X: DASH · Y: BOM · START: PAUSE · B: THOÁT</div>'+
    '</div>'+
    '<div class="na-stage"><canvas id="naCanvas" width="1280" height="720"></canvas></div>'+
  '</div>';
  canvas=document.getElementById('naCanvas');ctx=canvas?.getContext('2d',{alpha:false});
  if(!ctx)return;
  document.body.classList.add('game-running');
  document.getElementById('appPanel')?.classList.add('game-running','custom-game-running');
  window.tvGameActive=true;window.TVInput?.setGameMode?.(true);
  reset();running=true;lastFrame=0;lastTick=0;
  document.addEventListener('keydown',keyDown,true);document.addEventListener('keyup',keyUp,true);
  window.requestTVFullscreen?.();
  raf=requestAnimationFrame(frame);
}

function stop(){
  running=false;cancelAnimationFrame(raf);raf=0;keys.clear();pressed.clear();padPrev={};
  document.removeEventListener('keydown',keyDown,true);document.removeEventListener('keyup',keyUp,true);
  document.body.classList.remove('game-running');
  document.getElementById('appPanel')?.classList.remove('game-running','custom-game-running');
  window.tvGameActive=false;
  canvas=null;ctx=null;state=null;paused=false;
}

window.CustomTVGames.neonArena={start,stop};
})();