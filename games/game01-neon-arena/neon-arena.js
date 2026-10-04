(function(){
'use strict';

window.CustomTVGames=window.CustomTVGames||{};

const W=1280,H=720,MAX_FRAME_DT=.05,INPUT_DEADZONE_NATIVE=.018,INPUT_DEADZONE_BROWSER=.10,AIM_DEADZONE=.07,AUTO_AIM_RANGE=900,PICKUP_MAGNET_RANGE=155;
let canvas=null,ctx=null,raf=0,lastFrame=0,running=false,paused=false;
let state=null,onExit=null,frameAvg=1/60;
const keys=new Set(),pressed=new Set();
const padPrev={a:false,b:false,start:false,xButton:false,yButton:false};
const inputState={a:false,b:false,start:false,xButton:false,yButton:false,r2:false,x:0,y:0,rx:0,ry:0,bEdge:false,startEdge:false,xEdge:false,yEdge:false,aEdge:false};
const ASSET_URLS={
  player:'./games/game01-neon-arena/assets/player.png',
  drone:'./games/game01-neon-arena/assets/enemy-drone.png',
  runner:'./games/game01-neon-arena/assets/enemy-runner.png',
  tank:'./games/game01-neon-arena/assets/enemy-tank.png',
  boss:'./games/game01-neon-arena/assets/enemy-boss.png',
  bullet:'./games/game01-neon-arena/assets/bullet.png',
  heal:'./games/game01-neon-arena/assets/pickup-heal.png',
  bomb:'./games/game01-neon-arena/assets/pickup-bomb.png',
  shield:'./games/game01-neon-arena/assets/pickup-shield.png',
  rapid:'./games/game01-neon-arena/assets/pickup-rapid.png',
  arena:'./games/game01-neon-arena/assets/arena-bg.png'
};
const ASSET_FALLBACKS={
  player:'./games/game01-neon-arena/legacy-svg/player.svg',
  drone:'./games/game01-neon-arena/legacy-svg/enemy-drone.svg',
  runner:'./games/game01-neon-arena/legacy-svg/enemy-runner.svg',
  tank:'./games/game01-neon-arena/legacy-svg/enemy-tank.svg',
  boss:'./games/game01-neon-arena/legacy-svg/enemy-tank.svg',
  bullet:'./games/game01-neon-arena/legacy-svg/bullet.svg',
  heal:'./games/game01-neon-arena/legacy-svg/pickup-heal.svg',
  bomb:'./games/game01-neon-arena/legacy-svg/pickup-bomb.svg',
  arena:'./games/game01-neon-arena/legacy-svg/arena-bg.svg'
};
const assets=Object.create(null);
const raster=Object.create(null);
let assetsRequested=false;
let hudEls=null;
const hudCache={score:null,wave:null,bombs:null,hp:null};

function rasterizeAsset(key,img){
  try{
    const w=img.naturalWidth||256,h=img.naturalHeight||256;
    const c=document.createElement('canvas');
    c.width=w;c.height=h;
    const g=c.getContext('2d',{alpha:key!=='arena'});
    if(!g)return;
    g.imageSmoothingEnabled=true;
    g.drawImage(img,0,0,w,h);
    raster[key]=c;
  }catch(e){}
}
function preloadAssets(){
  if(assetsRequested)return;
  assetsRequested=true;
  for(const [key,url] of Object.entries(ASSET_URLS)){
    const img=new Image();
    img.decoding='async';
    img.onload=()=>rasterizeAsset(key,img);
    img.onerror=()=>{
      const fallback=ASSET_FALLBACKS[key];
      if(fallback&&img.src.indexOf('/legacy-svg/')<0){img.onerror=null;img.src=fallback}
    };
    img.src=url;
    assets[key]=img;
  }
}
function ready(key){
  const a=assets[key];
  return !!(raster[key]||(a&&a.complete&&a.naturalWidth));
}
function assetSource(key){return raster[key]||assets[key]}
function sprite(key,x,y,w,h,rot=0,alpha=1){
  if(!ready(key))return false;
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha=alpha;
  ctx.drawImage(assetSource(key),-w/2,-h/2,w,h);
  ctx.restore();ctx.globalAlpha=1;return true;
}

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function rand(min,max){return min+Math.random()*(max-min)}
function len(x,y){return Math.hypot(x,y)}
function circleHit(a,b,r){const dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy<r*r}
function edge(cur,key){return !!cur[key]&&!padPrev[key]}

function readInput(){
  const p=window.TVInput?.readGamepadState?.()||{};
  const left=(p.left?1:0),right=(p.right?1:0),up=(p.up?1:0),down=(p.down?1:0);
  const rawX=Number(p.x)||0,rawY=Number(p.y)||0;
  const deadzone=window.TVInput?.native?INPUT_DEADZONE_NATIVE:INPUT_DEADZONE_BROWSER;
  let x=Math.abs(rawX)>deadzone?rawX:right-left;
  let y=Math.abs(rawY)>deadzone?rawY:down-up;
  if(keys.has('ArrowLeft'))x=-1;
  if(keys.has('ArrowRight'))x=1;
  if(keys.has('ArrowUp'))y=-1;
  if(keys.has('ArrowDown'))y=1;
  const m=Math.hypot(x,y);if(m>1){x/=m;y/=m}

  const cur=inputState;
  cur.a=!!p.a||keys.has('Enter')||keys.has(' ');
  cur.b=!!p.b||keys.has('Escape');
  cur.start=!!p.start||keys.has('p');
  cur.xButton=!!p.xButton||keys.has('x');
  cur.yButton=!!p.yButton||keys.has('y');
  cur.r2=!!p.r2||(Number(p.rt)||0)>.10;
  cur.x=x;cur.y=y;cur.rx=Number(p.rx)||0;cur.ry=Number(p.ry)||0;
  cur.bEdge=edge(cur,'b')||pressed.has('Escape');
  cur.startEdge=edge(cur,'start')||pressed.has('p');
  cur.xEdge=edge(cur,'xButton')||pressed.has('x');
  cur.yEdge=edge(cur,'yButton')||pressed.has('y');
  cur.aEdge=edge(cur,'a')||pressed.has('Enter')||pressed.has(' ');
  padPrev.a=cur.a;padPrev.b=cur.b;padPrev.start=cur.start;
  padPrev.xButton=cur.xButton;padPrev.yButton=cur.yButton;
  pressed.clear();
  return cur;
}

function reset(){
  state={
    t:0,score:0,wave:1,kills:0,spawnTimer:.6,flash:0,shake:0,over:false,
    combo:0,comboTimer:0,bossWave:0,bossAlert:0,levelFlash:0,
    player:{x:W/2,y:H/2,r:18,hp:100,maxHp:100,speed:285,aimX:1,aimY:0,fireCd:0,dashCd:0,inv:0,bombs:2,level:1,xp:0,nextXp:70,fireInterval:.12,bulletDamage:1,multi:1,shield:0,rapid:0},
    bullets:[],enemies:[],particles:[],pickups:[],
    stars:Array.from({length:70},()=>({x:Math.random()*W,y:Math.random()*H,s:rand(.5,1.8),a:rand(.16,.52)}))
  };
  paused=false;
  padPrev.a=padPrev.b=padPrev.start=padPrev.xButton=padPrev.yButton=false;
  updateHud();
}

function enemyForWave(){
  const w=state.wave;
  const roll=Math.random();
  if(w>=4&&roll>.82)return{type:'tank',r:28,hp:5,speed:52,damage:24,value:50,xp:24};
  if(w>=2&&roll>.55)return{type:'runner',r:13,hp:1,speed:128+Math.min(50,w*4),damage:12,value:20,xp:9};
  return{type:'drone',r:18,hp:2,speed:78+Math.min(45,w*3),damage:16,value:30,xp:13};
}

function spawnEnemy(){
  const e=enemyForWave(),side=Math.floor(Math.random()*4),pad=45;
  if(side===0){e.x=-pad;e.y=rand(40,H-40)}
  if(side===1){e.x=W+pad;e.y=rand(40,H-40)}
  if(side===2){e.x=rand(40,W-40);e.y=-pad}
  if(side===3){e.x=rand(40,W-40);e.y=H+pad}
  state.enemies.push(e);
}

function spawnBoss(){
  const w=state.wave;
  const hp=18+w*4;
  const e={type:'boss',r:38,hp,maxHp:hp,speed:42+Math.min(24,w),damage:32,value:260,xp:90+w*5};
  const side=Math.floor(Math.random()*4),pad=70;
  if(side===0){e.x=-pad;e.y=rand(80,H-80)}
  if(side===1){e.x=W+pad;e.y=rand(80,H-80)}
  if(side===2){e.x=rand(80,W-80);e.y=-pad}
  if(side===3){e.x=rand(80,W-80);e.y=H+pad}
  state.enemies.push(e);
  state.bossWave=w;
  state.bossAlert=1.6;
}

function nearestTarget(p){
  let best=null,bestD=AUTO_AIM_RANGE*AUTO_AIM_RANGE;
  for(const e of state.enemies){
    if(e.dead||e.hp<=0)continue;
    const dx=e.x-p.x,dy=e.y-p.y,d=dx*dx+dy*dy;
    if(d<bestD){bestD=d;best=e}
  }
  return best;
}

function shoot(p){
  if(p.fireCd>0||state.bullets.length>96)return;
  p.fireCd=p.fireInterval*(p.rapid>0?.58:1);
  const base=Math.atan2(p.aimY,p.aimX);
  const count=p.multi||1;
  for(let i=0;i<count;i++){
    const lane=i-(count-1)/2;
    const a=base+lane*.085+rand(-.012,.012);
    const vx=Math.cos(a)*760,vy=Math.sin(a)*760;
    state.bullets.push({x:p.x+Math.cos(a)*24,y:p.y+Math.sin(a)*24,vx,vy,r:5,life:1.15,rot:a,damage:p.bulletDamage||1});
  }
}

function gainXp(p,amount){
  p.xp+=amount;
  while(p.xp>=p.nextXp){
    p.xp-=p.nextXp;
    p.level++;
    p.nextXp=Math.floor(p.nextXp*1.24+18);
    p.maxHp+=8;
    p.hp=Math.min(p.maxHp,p.hp+20);
    p.speed=Math.min(325,p.speed+3);
    p.fireInterval=Math.max(.072,p.fireInterval*.965);
    p.bulletDamage=1+Math.floor((p.level-1)/6);
    p.multi=1+(p.level>=5?1:0)+(p.level>=11?1:0);
    p.shield=Math.min(3,p.shield+1);
    state.levelFlash=.9;
    burst(p.x,p.y,24,'#78ffbe');
  }
}

function dash(p,input){
  if(p.dashCd>0)return;
  let dx=input.x,dy=input.y;
  if(Math.hypot(dx,dy)<.15){dx=p.aimX;dy=p.aimY}
  const dl=Math.hypot(dx,dy)||1;
  p.x=clamp(p.x+(dx/dl)*115,25,W-25);
  p.y=clamp(p.y+(dy/dl)*115,25,H-25);
  p.dashCd=1.15;p.inv=.22;state.shake=7;
  burst(p.x,p.y,14,'#65f6ff');
}

function bomb(p){
  if(p.bombs<=0)return;
  p.bombs--;state.flash=.16;state.shake=12;
  for(const e of state.enemies){
    const d=Math.hypot(e.x-p.x,e.y-p.y);
    if(d<300){const dx=e.x-p.x,dy=e.y-p.y,l=Math.hypot(dx,dy)||1;e.hp-=4;e.x+=(dx/l)*60;e.y+=(dy/l)*60}
  }
  burst(p.x,p.y,40,'#ffe65a');
}

function burst(x,y,count,color){
  const particleCap=frameAvg>.021?72:120;
  if(frameAvg>.025)count=Math.max(3,Math.ceil(count*.55));
  for(let i=0;i<count&&state.particles.length<particleCap;i++){
    const a=Math.random()*Math.PI*2,s=rand(40,240);
    state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.18,.6),max:.6,color,size:rand(2,5)});
  }
}

function damagePlayer(p,amount){
  if(p.inv>0||state.over)return;
  if(p.shield>0){
    p.shield--;p.inv=.42;state.flash=.07;state.shake=6;
    burst(p.x,p.y,16,'#72ddff');
    return;
  }
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
  state.comboTimer=Math.max(0,state.comboTimer-dt);if(state.comboTimer<=0)state.combo=0;
  state.bossAlert=Math.max(0,state.bossAlert-dt);state.levelFlash=Math.max(0,state.levelFlash-dt);
  p.fireCd=Math.max(0,p.fireCd-dt);p.dashCd=Math.max(0,p.dashCd-dt);p.inv=Math.max(0,p.inv-dt);p.rapid=Math.max(0,p.rapid-dt);

  p.x=clamp(p.x+input.x*p.speed*dt,24,W-24);
  p.y=clamp(p.y+input.y*p.speed*dt,24,H-24);

  const aimMag=Math.hypot(input.rx,input.ry);
  let target=null;
  if(aimMag>AIM_DEADZONE){p.aimX=input.rx/aimMag;p.aimY=input.ry/aimMag}
  else{
    target=nearestTarget(p);
    if(target){
      const dx=target.x-p.x,dy=target.y-p.y,l=Math.hypot(dx,dy)||1;
      p.aimX=dx/l;p.aimY=dy/l;
    }else if(Math.hypot(input.x,input.y)>.18){p.aimX=input.x;p.aimY=input.y}
  }

  // AUTO-FIRE is always on. Right stick can override auto-aim instantly.
  if(target||aimMag>AIM_DEADZONE||input.a||input.r2)shoot(p);
  if(input.xEdge)dash(p,input);
  if(input.yEdge)bomb(p);

  if(state.wave%5===0&&state.bossWave!==state.wave)spawnBoss();

  state.spawnTimer-=dt;
  const maxEnemies=Math.min(34,8+state.wave*3);
  if(state.spawnTimer<=0&&state.enemies.length<maxEnemies){
    spawnEnemy();
    state.spawnTimer=Math.max(.18,.72-state.wave*.045)*rand(.75,1.2);
  }

  for(const b of state.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt}
  for(const e of state.enemies){
    const dx=p.x-e.x,dy=p.y-e.y,l=Math.hypot(dx,dy)||1;
    e.x+=(dx/l)*e.speed*dt;e.y+=(dy/l)*e.speed*dt;
  }

  for(const b of state.bullets){
    if(b.life<=0)continue;
    for(const e of state.enemies){
      if(e.hp<=0)continue;
      if(circleHit(b,e,b.r+e.r)){b.life=0;e.hp-=b.damage||1;burst(b.x,b.y,4,'#62efff');break}
    }
  }

  for(const e of state.enemies){
    if(e.hp<=0)continue;
    if(circleHit(p,e,p.r+e.r)){const dx=e.x-p.x,dy=e.y-p.y,l=Math.hypot(dx,dy)||1;damagePlayer(p,e.damage);e.x+=(dx/l)*55;e.y+=(dy/l)*55}
  }

  for(const e of state.enemies){
    if(e.hp<=0&&!e.dead){
      e.dead=true;state.kills++;
      state.combo=state.comboTimer>0?state.combo+1:1;state.comboTimer=2.4;
      const comboMul=1+Math.min(1.5,Math.max(0,state.combo-1)*.08);
      state.score+=e.value*state.wave*comboMul;
      gainXp(p,e.xp||10);
      burst(e.x,e.y,e.type==='boss'?34:(e.type==='tank'?20:10),e.type==='runner'?'#ffbd55':(e.type==='boss'?'#ff5bd7':'#b36cff'));
      if(Math.random()<(e.type==='boss'?.9:.075)){
        const r=Math.random();
        const type=r<.50?'heal':r<.70?'bomb':r<.86?'shield':'rapid';
        state.pickups.push({x:e.x,y:e.y,r:10,type,life:9});
      }
    }
  }

  for(const q of state.pickups){
    q.life-=dt;
    const dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy)||1;
    if(d<PICKUP_MAGNET_RANGE){q.x+=(dx/d)*250*dt;q.y+=(dy/d)*250*dt}
    if(circleHit(p,q,p.r+q.r)){
      q.life=0;
      if(q.type==='heal')p.hp=Math.min(p.maxHp,p.hp+26);
      else if(q.type==='bomb')p.bombs=Math.min(5,p.bombs+1);
      else if(q.type==='shield')p.shield=Math.min(3,p.shield+1);
      else if(q.type==='rapid')p.rapid=Math.max(p.rapid,8);
      const color=q.type==='heal'?'#59f6a6':q.type==='bomb'?'#ffe65a':q.type==='shield'?'#72ddff':'#ff72f0';
      burst(q.x,q.y,12,color);
    }
  }

  for(const pt of state.particles){pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vx*=.95;pt.vy*=.95;pt.life-=dt}

  compact(state.bullets,b=>b.life>0&&b.x>-30&&b.x<W+30&&b.y>-30&&b.y<H+30);
  compact(state.enemies,e=>!e.dead);
  compact(state.pickups,q=>q.life>0);
  compact(state.particles,pt=>pt.life>0);
  updateHud();
}

function compact(arr,keep){
  let w=0;
  for(let r=0;r<arr.length;r++){const v=arr[r];if(keep(v))arr[w++]=v}
  arr.length=w;
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

  if(ready('arena'))ctx.drawImage(assetSource('arena'),-20,-20,W+40,H+40);
  else{
    const grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#07101e');grad.addColorStop(1,'#02060c');
    ctx.fillStyle=grad;ctx.fillRect(-20,-20,W+40,H+40);
  }

  ctx.strokeStyle='rgba(83,140,198,.09)';ctx.lineWidth=1;
  const grid=56,scroll=(state.t*12)%grid;
  for(let x=-grid+scroll;x<W+grid;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  for(let y=-grid+scroll;y<H+grid;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}

  for(const st of state.stars){ctx.globalAlpha=st.a;ctx.fillStyle='#b7ddff';ctx.fillRect(st.x,st.y,st.s,st.s)}
  ctx.globalAlpha=1;

  ctx.strokeStyle='rgba(83,224,255,.34)';ctx.lineWidth=3;roundedRect(16,16,W-32,H-32,28);ctx.stroke();

  for(const q of state.pickups){
    const pulse=1+Math.sin(state.t*5+q.x)*.07;
    let drawn=false;
    if(ASSET_URLS[q.type])drawn=sprite(q.type,q.x,q.y,38*pulse,38*pulse,state.t*1.4);
    if(!drawn){
      ctx.save();ctx.translate(q.x,q.y);ctx.rotate(state.t*1.7);
      ctx.fillStyle=q.type==='heal'?'#56efa2':q.type==='bomb'?'#ffe158':q.type==='shield'?'#72ddff':'#ff72f0';
      if(q.type==='heal'){ctx.fillRect(-4,-12,8,24);ctx.fillRect(-12,-4,24,8)}
      else if(q.type==='shield'){ctx.strokeStyle='#72ddff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.stroke()}
      else if(q.type==='rapid'){ctx.beginPath();ctx.moveTo(-4,-13);ctx.lineTo(7,-2);ctx.lineTo(1,-2);ctx.lineTo(5,13);ctx.lineTo(-8,1);ctx.lineTo(-1,1);ctx.closePath();ctx.fill()}
      else{ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill()}
      ctx.restore();
    }
  }

  for(const b of state.bullets){
    if(!sprite('bullet',b.x,b.y,34,18,b.rot)){
      ctx.fillStyle='#6df7ff';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();
    }
  }

  for(const e of state.enemies){
    const ang=Math.atan2(state.player.y-e.y,state.player.x-e.x);
    const size=e.type==='boss'?108:e.type==='tank'?76:e.type==='runner'?48:58;
    const rot=(e.type==='tank'||e.type==='boss')?state.t*.35:ang;
    const assetKey=e.type;
    if(!sprite(assetKey,e.x,e.y,size,size,rot)){
      ctx.save();ctx.translate(e.x,e.y);
      if(e.type==='runner'){
        ctx.fillStyle='#ffb14a';ctx.rotate(ang);
        ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(-11,-10);ctx.lineTo(-6,0);ctx.lineTo(-11,10);ctx.closePath();ctx.fill();
      }else if(e.type==='tank'){
        ctx.fillStyle='#e84f78';ctx.rotate(state.t*.55);ctx.fillRect(-22,-22,44,44);
      }else{
        ctx.fillStyle='#a76bff';ctx.beginPath();ctx.arc(0,0,e.r,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
    if(e.type==='tank'||e.type==='boss'){
      const barW=e.type==='boss'?92:60,barY=e.y-(e.type==='boss'?66:43);
      const maxHp=e.type==='boss'?e.maxHp:5;
      ctx.fillStyle='rgba(0,0,0,.48)';ctx.fillRect(e.x-barW/2,barY,barW,6);
      ctx.fillStyle=e.type==='boss'?'#ff5bd7':'#ff688f';ctx.fillRect(e.x-barW/2,barY,barW*Math.max(0,e.hp/maxHp),6);
    }
  }

  for(const pt of state.particles){
    ctx.globalAlpha=clamp(pt.life/pt.max,0,1);ctx.fillStyle=pt.color;
    ctx.fillRect(pt.x-pt.size/2,pt.y-pt.size/2,pt.size,pt.size);
  }
  ctx.globalAlpha=1;

  const p=state.player;
  if(p.shield>0){
    ctx.strokeStyle='rgba(114,221,255,.74)';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(p.x,p.y,31+Math.sin(state.t*5)*2,0,Math.PI*2);ctx.stroke();
  }
  if(p.inv<=0||Math.floor(state.t*18)%2===0){
    const ang=Math.atan2(p.aimY,p.aimX);
    if(!sprite('player',p.x,p.y,76,76,ang)){
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(ang);
      ctx.fillStyle='#55e9ff';ctx.beginPath();ctx.moveTo(24,0);ctx.lineTo(-13,-15);ctx.lineTo(-7,0);ctx.lineTo(-13,15);ctx.closePath();ctx.fill();
      ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(3,0,5,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();

  if(state.flash>0){ctx.fillStyle='rgba(255,255,255,'+Math.min(.24,state.flash*1.4)+')';ctx.fillRect(0,0,W,H)}
  if(state.bossAlert>0){
    ctx.textAlign='center';ctx.fillStyle='rgba(255,91,215,'+Math.min(1,state.bossAlert)+')';
    ctx.font='900 38px Arial';ctx.fillText('⚠ BOSS WAVE '+state.wave,W/2,98);ctx.textAlign='left';
  }
  if(state.levelFlash>0){
    ctx.textAlign='center';ctx.fillStyle='rgba(120,255,190,'+Math.min(1,state.levelFlash*1.3)+')';
    ctx.font='900 32px Arial';ctx.fillText('LEVEL UP · LV '+state.player.level,W/2,142);ctx.textAlign='left';
  }
  if(paused)drawOverlay('TẠM DỪNG','START để tiếp tục · B để thoát');
  if(state.over)drawOverlay('GAME OVER','Điểm '+Math.floor(state.score)+' · LV '+state.player.level+' · A chơi lại · B thoát');
}

function drawOverlay(title,sub){
  ctx.fillStyle='rgba(2,6,12,.76)';ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 64px Arial';ctx.fillText(title,W/2,H/2-28);
  ctx.fillStyle='#9ec4de';ctx.font='700 24px Arial';ctx.fillText(sub,W/2,H/2+28);ctx.textAlign='left';
}

function updateHud(){
  if(!state||!hudEls)return;
  const p=state.player;
  const score=String(Math.floor(state.score)).padStart(6,'0')+(state.combo>1?' · COMBO x'+state.combo:'');
  const wave='WAVE '+state.wave+' · LV '+p.level;
  const bombs='XP '+p.xp+'/'+p.nextXp+' · Y BOM '+p.bombs+' · SHD '+p.shield+(p.rapid>0?' · RAPID '+Math.ceil(p.rapid)+'s':'');
  const hp=Math.round(Math.max(0,p.hp/p.maxHp*100)*10)/10;
  if(score!==hudCache.score){hudCache.score=score;if(hudEls.score)hudEls.score.textContent=score}
  if(wave!==hudCache.wave){hudCache.wave=wave;if(hudEls.wave)hudEls.wave.textContent=wave}
  if(bombs!==hudCache.bombs){hudCache.bombs=bombs;if(hudEls.bombs)hudEls.bombs.textContent=bombs}
  if(hp!==hudCache.hp){hudCache.hp=hp;if(hudEls.hp)hudEls.hp.style.width=hp+'%'}
}

function frame(t){
  if(!running)return;
  raf=requestAnimationFrame(frame);

  const dt=lastFrame?Math.min(MAX_FRAME_DT,Math.max(.001,(t-lastFrame)/1000)):1/60;
  lastFrame=t;
  frameAvg=frameAvg*.94+dt*.06;

  // Read the controller on every display frame. No 30 FPS throttle and no
  // evaluateJavascript path while the Android app's native GAME mode is active.
  const input=readInput();
  if(input.bEdge){stop();onExit?.();return}
  if(state?.over){
    if(input.aEdge)reset();
  }else{
    if(input.startEdge)paused=!paused;
    if(!paused)update(dt,input);
  }

  // Render on every requestAnimationFrame. On a 60 Hz TV this is true 60 FPS.
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
      '<div class="na-controls">AUTO-FIRE: ON · L: DI CHUYỂN · R: ƯU TIÊN NGẮM · X: DASH · Y: BOM · START: PAUSE · B: THOÁT</div>'+
    '</div>'+
    '<div class="na-stage"><canvas id="naCanvas" width="1280" height="720"></canvas></div>'+
  '</div>';
  canvas=document.getElementById('naCanvas');ctx=canvas?.getContext('2d',{alpha:false,desynchronized:true});
  if(!ctx)return;
  hudEls={
    score:document.getElementById('naScore'),
    wave:document.getElementById('naWave'),
    bombs:document.getElementById('naBombs'),
    hp:document.getElementById('naHpFill')
  };
  hudCache.score=hudCache.wave=hudCache.bombs=hudCache.hp=null;
  preloadAssets();
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='medium';
  document.body.classList.add('game-running');
  document.getElementById('appPanel')?.classList.add('game-running','custom-game-running');
  window.tvGameActive=true;window.TVInput?.setGameMode?.(true);
  reset();running=true;lastFrame=0;
  document.addEventListener('keydown',keyDown,true);document.addEventListener('keyup',keyUp,true);
  window.requestTVFullscreen?.();
  raf=requestAnimationFrame(frame);
}

function stop(){
  running=false;cancelAnimationFrame(raf);raf=0;keys.clear();pressed.clear();
  padPrev.a=padPrev.b=padPrev.start=padPrev.xButton=padPrev.yButton=false;
  document.removeEventListener('keydown',keyDown,true);document.removeEventListener('keyup',keyUp,true);
  document.body.classList.remove('game-running');
  document.getElementById('appPanel')?.classList.remove('game-running','custom-game-running');
  window.tvGameActive=false;
  window.TVInput?.setGameMode?.(false);
  canvas=null;ctx=null;state=null;hudEls=null;paused=false;lastFrame=0;
}

window.CustomTVGames.neonArena={start,stop};
})();