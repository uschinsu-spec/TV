(function(){
'use strict';

window.CustomTVGames=window.CustomTVGames||{};

const W=1280,H=720,WORLD_W=2560,WORLD_H=1440,MAX_DT=.05;
const ASSETS={
  forest:'./assets/game02/cultivation-forest/forest-bg.svg',
  player:'./assets/game02/cultivation-forest/player.svg',
  wolf:'./assets/game02/cultivation-forest/enemy-wolf.svg',
  bandit:'./assets/game02/cultivation-forest/enemy-bandit.svg',
  tree:'./assets/game02/cultivation-forest/enemy-tree.svg',
  boar:'./assets/game02/cultivation-forest/enemy-boar.svg',
  guardian:'./assets/game02/cultivation-forest/boss-guardian.svg',
  spirit:'./assets/game02/cultivation-forest/pickup-spirit.svg',
  qi:'./assets/game02/cultivation-forest/pickup-qi.svg',
  gourd:'./assets/game02/cultivation-forest/pickup-gourd.svg',
  talisman:'./assets/game02/cultivation-forest/pickup-talisman.svg'
};
const imgs=Object.create(null),raster=Object.create(null);
let assetsStarted=false,canvas=null,ctx=null,raf=0,lastFrame=0,running=false,onExit=null;
let state=null,frameAvg=1/60;
const keys=new Set(),pressed=new Set();
const prev={a:false,b:false,start:false,xBtn:false,yBtn:false,left:false,right:false,up:false,down:false};
const input={x:0,y:0,rx:0,ry:0,a:false,b:false,start:false,xBtn:false,yBtn:false,r2:false,aEdge:false,bEdge:false,startEdge:false,xEdge:false,yEdge:false,leftEdge:false,rightEdge:false,upEdge:false,downEdge:false};
const upgrades=[
  {id:'blade',name:'Kiếm Ý',desc:'+25% sát thương kiếm',max:8},
  {id:'body',name:'Luyện Thể',desc:'+20% HP tối đa, hồi 20%',max:6},
  {id:'step',name:'Thân Pháp',desc:'+10% tốc độ, dash nhanh hơn',max:6},
  {id:'gather',name:'Tụ Linh',desc:'+18% phạm vi hút linh khí',max:6},
  {id:'sword',name:'Phi Kiếm',desc:'+1 mục tiêu mỗi đòn',max:5},
  {id:'thunder',name:'Lôi Phù',desc:'Sét đánh tự động theo chu kỳ',max:5},
  {id:'guard',name:'Hộ Thể',desc:'+10% giảm sát thương',max:5},
  {id:'crit',name:'Sát Ý',desc:'+6% tỷ lệ chí mạng',max:5}
];

function clamp(v,a,b){return v<a?a:v>b?b:v}
function rand(a,b){return a+Math.random()*(b-a)}
function dist2(ax,ay,bx,by){const x=ax-bx,y=ay-by;return x*x+y*y}
function compact(arr,keep){let w=0;for(let r=0;r<arr.length;r++){const v=arr[r];if(keep(v))arr[w++]=v}arr.length=w}
function edge(cur,key){return !!cur[key]&&!prev[key]}
function realmTier(level){
  if(level<10)return 0;
  if(level<25)return 1;
  if(level<40)return 2;
  if(level<58)return 3;
  return 4;
}
function realm(level){
  if(level<10)return 'Luyện Khí · Tầng '+level;
  if(level<15)return 'Trúc Cơ · Sơ Kỳ';
  if(level<20)return 'Trúc Cơ · Trung Kỳ';
  if(level<25)return 'Trúc Cơ · Hậu Kỳ';
  if(level<32)return 'Kim Đan · Sơ Kỳ';
  if(level<40)return 'Kim Đan · Hậu Kỳ';
  if(level<49)return 'Nguyên Anh · Sơ Kỳ';
  if(level<58)return 'Nguyên Anh · Hậu Kỳ';
  return 'Hóa Thần · Sơ Kỳ';
}
function xpNeed(level){return Math.floor(42+level*22+level*level*2.4)}

function rasterize(k,img){
  try{
    const c=document.createElement('canvas');
    c.width=img.naturalWidth||256;c.height=img.naturalHeight||256;
    const g=c.getContext('2d',{alpha:k!=='forest'});
    if(!g)return;
    g.imageSmoothingEnabled=true;g.drawImage(img,0,0,c.width,c.height);raster[k]=c;
  }catch(e){}
}
function preload(){
  if(assetsStarted)return;
  assetsStarted=true;
  for(const [k,url] of Object.entries(ASSETS)){
    const im=new Image();im.decoding='async';im.onload=()=>rasterize(k,im);im.src=url;imgs[k]=im;
  }
}
function source(k){return raster[k]||imgs[k]}
function ready(k){const a=source(k);return !!(a&&(a.width||a.naturalWidth))}
function drawSprite(k,x,y,w,h,rot=0,alpha=1){
  if(!ready(k))return false;
  ctx.save();ctx.translate(x-state.cam.x,y-state.cam.y);ctx.rotate(rot);ctx.globalAlpha=alpha;
  ctx.drawImage(source(k),-w/2,-h/2,w,h);ctx.restore();ctx.globalAlpha=1;return true;
}

function reset(){
  const meta=loadMeta();
  const legacy=Math.min(.22,Math.floor((meta.spirit||0)/25)*.01);
  state={
    t:0,mode:'play',score:0,kills:0,level:1,xp:0,xpNeed:xpNeed(1),wave:1,
    spawn:.3,eliteTimer:35,bossTier:0,shake:0,flash:0,message:legacy>0?'Linh căn tích lũy +'+Math.round(legacy*100)+'%':'',messageT:legacy>0?2.2:0,
    cam:{x:WORLD_W/2-W/2,y:WORLD_H/2-H/2},
    player:{x:WORLD_W/2,y:WORLD_H/2,r:22,hp:180*(1+legacy),maxHp:180*(1+legacy),speed:270*(1+legacy*.25),damage:32*(1+legacy),attackCd:0,attackRate:.44,range:175,pickup:105,crit:.06+legacy*.08,targets:1,dashCd:0,dashMax:1.05,inv:0,guard:0,bombs:2,spirit:meta.spirit||0,
      swordLv:1,armorLv:1,jadeLv:1,up:{blade:0,body:0,step:0,gather:0,sword:0,thunder:0,guard:0,crit:0},thunderCd:3.2},
    enemies:[],drops:[],particles:[],slashes:[],damageText:[],choices:[],choice:0,
    mapDots:[]
  };
  for(const k in prev)prev[k]=false;
}
function loadMeta(){try{return JSON.parse(localStorage.getItem('tv-game02-meta')||'{}')}catch(e){return{}}}
function saveMeta(){
  try{
    const old=loadMeta();
    localStorage.setItem('tv-game02-meta',JSON.stringify({
      spirit:state.player.spirit,
      bestLevel:Math.max(old.bestLevel||0,state.level),
      bestKills:Math.max(old.bestKills||0,state.kills),
      bestRealm:realm(Math.max(old.bestLevel||0,state.level))
    }));
  }catch(e){}
}

function readInput(){
  const p=window.TVInput?.readGamepadState?.()||{};
  let x=Number(p.x)||0,y=Number(p.y)||0;
  if(Math.abs(x)<.018)x=(p.right?1:0)-(p.left?1:0);
  if(Math.abs(y)<.018)y=(p.down?1:0)-(p.up?1:0);
  if(keys.has('ArrowLeft'))x=-1;if(keys.has('ArrowRight'))x=1;if(keys.has('ArrowUp'))y=-1;if(keys.has('ArrowDown'))y=1;
  const m=Math.hypot(x,y);if(m>1){x/=m;y/=m}
  input.x=x;input.y=y;input.rx=Number(p.rx)||0;input.ry=Number(p.ry)||0;
  input.a=!!p.a||keys.has('Enter')||keys.has(' ');
  input.b=!!p.b||keys.has('Escape');
  input.start=!!p.start||keys.has('p');
  input.xBtn=!!p.xButton||keys.has('x');
  input.yBtn=!!p.yButton||keys.has('y');
  input.r2=!!p.r2||(Number(p.rt)||0)>.10;
  const left=!!p.left||x<-.55,right=!!p.right||x>.55,up=!!p.up||y<-.55,down=!!p.down||y>.55;
  input.aEdge=edge(input,'a')||pressed.has('Enter')||pressed.has(' ');
  input.bEdge=edge(input,'b')||pressed.has('Escape');
  input.startEdge=edge(input,'start')||pressed.has('p');
  input.xEdge=edge(input,'xBtn')||pressed.has('x');
  input.yEdge=edge(input,'yBtn')||pressed.has('y');
  input.leftEdge=left&&!prev.left;input.rightEdge=right&&!prev.right;input.upEdge=up&&!prev.up;input.downEdge=down&&!prev.down;
  prev.a=input.a;prev.b=input.b;prev.start=input.start;prev.xBtn=input.xBtn;prev.yBtn=input.yBtn;prev.left=left;prev.right=right;prev.up=up;prev.down=down;
  pressed.clear();return input;
}

function enemyTemplate(type,elite=false,boss=false){
  const lv=state.level,w=state.wave;
  if(type==='wolf')return{type,r:19,hp:32+lv*5,speed:112+Math.min(70,w*3),damage:13+lv*.8,xp:8,value:9,elite,boss:false};
  if(type==='bandit')return{type,r:23,hp:58+lv*8,speed:82+Math.min(45,w*2),damage:18+lv, xp:12,value:14,elite,boss:false};
  if(type==='tree')return{type,r:31,hp:145+lv*16,speed:48+Math.min(25,w),damage:27+lv*1.1,xp:22,value:26,elite,boss:false};
  if(type==='guardian')return{type,r:58,hp:(420+lv*34)*4.8,speed:45,damage:(38+lv*1.5)*1.5,xp:220,value:340,elite:true,boss:true};
  const mult=boss?4.6:elite?2.1:1;
  return{type:'boar',r:boss?54:38,hp:(230+lv*26)*mult,speed:boss?50:63,damage:(34+lv*1.4)*(boss?1.45:1),xp:boss?180:50,value:boss?260:65,elite:elite||boss,boss};
}
function spawnEnemy(type=null,elite=false,boss=false){
  if(state.enemies.length>58&&!boss)return;
  const p=state.player,ang=Math.random()*Math.PI*2,rad=620+Math.random()*180;
  let x=clamp(p.x+Math.cos(ang)*rad,55,WORLD_W-55),y=clamp(p.y+Math.sin(ang)*rad,55,WORLD_H-55);
  if(!type){
    const r=Math.random();
    type=state.level>=5&&r>.87?'tree':state.level>=2&&r>.57?'bandit':'wolf';
  }
  const e=enemyTemplate(type,elite,boss);e.x=x;e.y=y;e.maxHp=e.hp;e.hit=0;e.dead=false;e.id=Math.random();
  state.enemies.push(e);
  if(boss)showMessage('YÊU VƯƠNG XUẤT HIỆN',2.2);
}
function spawnBoss(){
  state.bossTier++;
  spawnEnemy(state.bossTier%2===1?'guardian':'boar',true,true);
}

function nearestTargets(maxCount,range,dirX=0,dirY=0){
  const p=state.player,r2=range*range,arr=[];
  const hasDir=Math.hypot(dirX,dirY)>.2;
  for(const e of state.enemies){
    if(e.dead)continue;
    const d=dist2(p.x,p.y,e.x,e.y);if(d>r2)continue;
    if(hasDir){
      const l=Math.sqrt(d)||1,dot=((e.x-p.x)/l)*dirX+((e.y-p.y)/l)*dirY;
      if(dot<-.1)continue;
    }
    let pos=arr.length;
    while(pos>0&&arr[pos-1].d>d)pos--;
    arr.splice(pos,0,{e,d});if(arr.length>maxCount)arr.pop();
  }
  return arr;
}
function attack(boost=false){
  const p=state.player;if(p.attackCd>0)return;
  p.attackCd=p.attackRate*(boost?.55:1);
  let dx=input.rx,dy=input.ry;
  const rm=Math.hypot(dx,dy);
  if(rm>.07){dx/=rm;dy/=rm}else if(Math.hypot(input.x,input.y)>.15){dx=input.x;dy=input.y}else{dx=0;dy=0}
  const list=nearestTargets(p.targets,p.range,dx,dy);
  if(!list.length)return;
  for(const o of list){
    const e=o.e;let dmg=p.damage*(1+p.swordLv*.12);
    const crit=Math.random()<p.crit;if(crit)dmg*=1.85;
    e.hp-=dmg;e.hit=.11;
    state.damageText.push({x:e.x,y:e.y-25,t:.65,text:(crit?'Bạo ':'')+Math.round(dmg),crit});
    slashAt(e.x,e.y,crit?'#ffe28b':'#8feaff');
    if(e.hp<=0)killEnemy(e);
  }
}
function slashAt(x,y,color){
  state.slashes.push({x,y,t:.18,max:.18,color,rot:rand(-1,1)});
  burst(x,y,5,color);
}
function thunderStrike(){
  const p=state.player,lv=p.up.thunder;if(!lv)return;
  p.thunderCd-=1/60;if(p.thunderCd>0)return;
  p.thunderCd=Math.max(.75,3.1-lv*.38);
  const list=nearestTargets(1,360);
  if(!list.length)return;
  const e=list[0].e,d=p.damage*(.9+lv*.38);e.hp-=d;e.hit=.15;
  for(let i=0;i<12;i++)state.particles.push({x:e.x+rand(-22,22),y:e.y-rand(10,110),vx:rand(-20,20),vy:rand(40,120),t:rand(.18,.35),max:.35,color:'#84ddff',s:rand(2,5)});
  if(e.hp<=0)killEnemy(e);
}
function killEnemy(e){
  if(e.dead)return;e.dead=true;state.kills++;state.score+=Math.round(e.value*(1+state.level*.08));
  dropAt(e.x,e.y,'qi',e.xp);
  const roll=Math.random();
  if(e.boss){dropAt(e.x+30,e.y,'gear',Math.min(4,2+state.bossTier));dropAt(e.x-30,e.y,'spirit',8+state.bossTier*2);dropAt(e.x,e.y+35,'gourd',1);state.player.spirit+=5;showMessage('HẠ YÊU VƯƠNG · NHẬN LINH THẠCH',2)}
  else if(e.elite&&roll<.7)dropAt(e.x,e.y,'gear',2);
  else if(roll<.05)dropAt(e.x,e.y,'gourd',1);
  else if(roll<.095)dropAt(e.x,e.y,'spirit',1);
  else if(roll<.12)dropAt(e.x,e.y,'gear',1);
  burst(e.x,e.y,e.boss?28:e.elite?18:9,e.type==='tree'?'#71e88b':e.type==='wolf'?'#79d9ff':'#e1b477');
}
function dropAt(x,y,type,value){state.drops.push({x,y,type,value,t:14,r:type==='gear'?18:13,bob:Math.random()*6.28})}
function burst(x,y,count,color){
  const cap=frameAvg>.021?72:105;if(frameAvg>.026)count=Math.max(2,Math.ceil(count*.55));
  for(let i=0;i<count&&state.particles.length<cap;i++){const a=Math.random()*6.283,s=rand(35,190);state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:rand(.2,.55),max:.55,color,s:rand(2,5)})}
}
function showMessage(s,t=1.2){state.message=s;state.messageT=t}

function gainXp(v){
  state.xp+=v;
  if(state.xp>=state.xpNeed&&state.mode==='play'){
    const oldTier=realmTier(state.level);
    state.xp-=state.xpNeed;state.level++;state.xpNeed=xpNeed(state.level);
    const p=state.player;
    p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.12);
    const newTier=realmTier(state.level);
    if(newTier>oldTier){
      p.maxHp*=1.15;p.hp=p.maxHp;p.damage*=1.12;p.speed*=1.04;p.bombs=Math.min(5,p.bombs+1);
      p.spirit+=5+newTier*3;
      showMessage('ĐỘT PHÁ · '+realm(state.level),2.3);
      state.flash=.2;state.shake=10;burst(p.x,p.y,34,'#ffe886');
    }
    if(state.level%5===0)spawnBoss();
    openLevelUp();
  }
}
function openLevelUp(){
  state.mode='levelup';state.choice=0;state.choices=[];
  const pool=upgrades.filter(u=>(state.player.up[u.id]||0)<u.max);
  while(state.choices.length<3&&pool.length){
    const i=Math.floor(Math.random()*pool.length);state.choices.push(pool.splice(i,1)[0]);
  }
}
function applyUpgrade(u){
  const p=state.player;p.up[u.id]=(p.up[u.id]||0)+1;
  switch(u.id){
    case 'blade':p.damage*=1.25;break;
    case 'body':p.maxHp*=1.20;p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.2);break;
    case 'step':p.speed*=1.10;p.dashMax=Math.max(.55,p.dashMax*.9);break;
    case 'gather':p.pickup*=1.18;break;
    case 'sword':p.targets=Math.min(6,p.targets+1);break;
    case 'thunder':p.thunderCd=Math.min(p.thunderCd,.8);break;
    case 'guard':p.guard=Math.min(.5,p.guard+.10);break;
    case 'crit':p.crit=Math.min(.48,p.crit+.06);break;
  }
  showMessage(u.name+' · Lv.'+p.up[u.id],1.4);state.mode='play';
}
function gearRank(power){
  return power>=4?'Địa':power===3?'Huyền':power===2?'Hoàng':'Phàm';
}
function gearDrop(power){
  const p=state.player,r=Math.random(),rank=gearRank(power);
  if(r<.4){p.swordLv+=power;p.damage*=1+.05*power;showMessage(rank+' phẩm · Thanh Phong Kiếm +'+p.swordLv,1.6)}
  else if(r<.75){p.armorLv+=power;p.maxHp+=22*power;p.hp+=22*power;showMessage(rank+' phẩm · Huyền Thiết Giáp +'+p.armorLv,1.6)}
  else{p.jadeLv+=power;p.crit=Math.min(.5,p.crit+.018*power);p.pickup+=10*power;showMessage(rank+' phẩm · Tụ Linh Ngọc +'+p.jadeLv,1.6)}
}
function collectDrop(d){
  const p=state.player;
  if(d.type==='qi')gainXp(d.value);
  else if(d.type==='spirit'){p.spirit+=d.value;showMessage('+'+d.value+' Linh Thạch',.8)}
  else if(d.type==='gourd'){p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.35);showMessage('Hồi Khí Đan',.8)}
  else if(d.type==='gear')gearDrop(d.value);
  d.t=0;
}

function damagePlayer(amount){
  const p=state.player;if(p.inv>0||state.mode!=='play')return;
  amount*=1-p.guard;amount*=1-Math.min(.3,(p.armorLv-1)*.025);
  p.hp-=amount;p.inv=.6;state.shake=7;state.flash=.08;burst(p.x,p.y,12,'#ff6d76');
  if(p.hp<=0){p.hp=0;state.mode='gameover';saveMeta()}
}
function dash(){
  const p=state.player;if(p.dashCd>0)return;
  let dx=input.x,dy=input.y;if(Math.hypot(dx,dy)<.1){dx=input.rx;dy=input.ry}let m=Math.hypot(dx,dy);if(m<.1){dx=1;dy=0;m=1}
  p.x=clamp(p.x+dx/m*145,30,WORLD_W-30);p.y=clamp(p.y+dy/m*145,30,WORLD_H-30);p.inv=.24;p.dashCd=p.dashMax;state.shake=4;burst(p.x,p.y,12,'#8df7ff');
}
function bomb(){
  const p=state.player;if(p.bombs<=0)return;p.bombs--;state.shake=10;state.flash=.13;
  for(const e of state.enemies){if(e.dead)continue;const d=dist2(p.x,p.y,e.x,e.y);if(d<330*330){e.hp-=p.damage*3.2;if(e.hp<=0)killEnemy(e)}}
  burst(p.x,p.y,36,'#ffd86e');
}

function update(dt){
  if(state.mode!=='play')return;
  const p=state.player;
  state.t+=dt;state.wave=1+Math.floor(state.t/28);state.shake=Math.max(0,state.shake-dt*25);state.flash=Math.max(0,state.flash-dt);state.messageT=Math.max(0,state.messageT-dt);
  p.attackCd=Math.max(0,p.attackCd-dt);p.dashCd=Math.max(0,p.dashCd-dt);p.inv=Math.max(0,p.inv-dt);
  p.x=clamp(p.x+input.x*p.speed*dt,35,WORLD_W-35);p.y=clamp(p.y+input.y*p.speed*dt,35,WORLD_H-35);
  if(input.xEdge)dash();if(input.yEdge)bomb();
  if(input.a||input.r2)attack(true);else if(p.attackCd<=0)attack(false);
  if(p.up.thunder){p.thunderCd-=dt;if(p.thunderCd<=0){p.thunderCd=Math.max(.75,3.1-p.up.thunder*.38);const l=nearestTargets(1,380);if(l.length){const e=l[0].e,d=p.damage*(.9+p.up.thunder*.38);e.hp-=d;state.slashes.push({x:e.x,y:e.y,t:.25,max:.25,color:'#9ee9ff',rot:-1.2});burst(e.x,e.y,14,'#8fdfff');if(e.hp<=0)killEnemy(e)}}}
  state.spawn-=dt;
  const max=Math.min(52,15+state.wave*3+Math.floor(state.level*.8));
  if(state.spawn<=0&&state.enemies.length<max){spawnEnemy();state.spawn=Math.max(.13,.58-state.wave*.025-state.level*.008)*rand(.78,1.18)}
  state.eliteTimer-=dt;if(state.eliteTimer<=0){spawnEnemy(state.level>6?'boar':'tree',true,false);state.eliteTimer=Math.max(22,39-state.wave)}
  for(const e of state.enemies){
    if(e.dead)continue;e.hit=Math.max(0,e.hit-dt);
    const dx=p.x-e.x,dy=p.y-e.y,m=Math.hypot(dx,dy)||1;
    e.x+=dx/m*e.speed*dt;e.y+=dy/m*e.speed*dt;
    if(m<p.r+e.r+2){damagePlayer(e.damage);e.x-=dx/m*28;e.y-=dy/m*28}
  }
  for(const d of state.drops){
    d.t-=dt;d.bob+=dt*3.5;const dd=dist2(p.x,p.y,d.x,d.y);
    if(dd<p.pickup*p.pickup){const m=Math.sqrt(dd)||1;d.x+=(p.x-d.x)/m*Math.min(420*dt,m);d.y+=(p.y-d.y)/m*Math.min(420*dt,m)}
    if(dd<(p.r+d.r+8)*(p.r+d.r+8))collectDrop(d);
  }
  for(const pt of state.particles){pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vx*=.96;pt.vy*=.96;pt.t-=dt}
  for(const s of state.slashes)s.t-=dt;for(const d of state.damageText){d.t-=dt;d.y-=34*dt}
  compact(state.enemies,e=>!e.dead);compact(state.drops,d=>d.t>0);compact(state.particles,p=>p.t>0);compact(state.slashes,s=>s.t>0);compact(state.damageText,d=>d.t>0);
  const tx=clamp(p.x-W/2,0,WORLD_W-W),ty=clamp(p.y-H/2,0,WORLD_H-H);
  state.cam.x+=(tx-state.cam.x)*Math.min(1,dt*7);state.cam.y+=(ty-state.cam.y)*Math.min(1,dt*7);
}

function drawBackground(){
  if(ready('forest')){
    const im=source('forest'),tw=1280,th=720;
    const sx=Math.floor(state.cam.x/tw),sy=Math.floor(state.cam.y/th);
    for(let yy=sy;yy<=sy+1;yy++)for(let xx=sx;xx<=sx+1;xx++)ctx.drawImage(im,xx*tw-state.cam.x,yy*th-state.cam.y,tw,th);
  }else{ctx.fillStyle='#173827';ctx.fillRect(0,0,W,H)}
  const gx=160,gy=160;
  ctx.globalAlpha=.11;ctx.strokeStyle='#dbcfaa';ctx.lineWidth=2;
  for(let x=-(state.cam.x%gx);x<W;x+=gx){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  for(let y=-(state.cam.y%gy);y<H;y+=gy){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  ctx.globalAlpha=1;
}
function draw(){
  if(!ctx||!state)return;
  const sh=state.shake,ox=sh?rand(-sh,sh):0,oy=sh?rand(-sh,sh):0;
  ctx.save();ctx.translate(ox,oy);drawBackground();
  for(const d of state.drops){
    const y=d.y+Math.sin(d.bob)*5,k=d.type==='qi'?'qi':d.type==='spirit'?'spirit':d.type==='gourd'?'gourd':d.type==='gear'?'talisman':null;
    if(k&&drawSprite(k,d.x,y,34,34,0,.98)){}
    else{
      const sx=d.x-state.cam.x,sy=y-state.cam.y;ctx.save();ctx.translate(sx,sy);
      ctx.fillStyle=d.type==='gear'?'#ffd66c':'#b585ff';ctx.beginPath();ctx.arc(0,0,d.type==='gear'?12:9,0,6.283);ctx.fill();
      if(d.type==='gear'){ctx.strokeStyle='#fff0a8';ctx.strokeRect(-10,-10,20,20)}ctx.restore();
    }
  }
  for(const e of state.enemies){
    const dx=state.player.x-e.x,dy=state.player.y-e.y,rot=Math.atan2(dy,dx);
    const size=e.type==='guardian'?152:e.boss?138:e.type==='boar'?92:e.type==='tree'?82:e.type==='bandit'?68:62;
    drawSprite(e.type,e.x,e.y,size,size,rot, e.hit>0?.65:1);
    if(e.elite){
      const x=e.x-state.cam.x,y=e.y-state.cam.y-size*.54,w=e.boss?100:66;
      ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(x-w/2,y,w,7);ctx.fillStyle=e.boss?'#ffcf56':'#ff6c62';ctx.fillRect(x-w/2,y,w*clamp(e.hp/e.maxHp,0,1),7);
    }
  }
  for(const s of state.slashes){
    const x=s.x-state.cam.x,y=s.y-state.cam.y,a=s.t/s.max;ctx.save();ctx.translate(x,y);ctx.rotate(s.rot);ctx.globalAlpha=a;ctx.strokeStyle=s.color;ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,0,48,-1.1,1.1);ctx.stroke();ctx.restore();
  }
  for(const pt of state.particles){
    const x=pt.x-state.cam.x,y=pt.y-state.cam.y;ctx.globalAlpha=clamp(pt.t/pt.max,0,1);ctx.fillStyle=pt.color;ctx.fillRect(x-pt.s/2,y-pt.s/2,pt.s,pt.s);
  }
  ctx.globalAlpha=1;
  const p=state.player,aim=Math.hypot(input.rx,input.ry)>.07?Math.atan2(input.ry,input.rx):Math.atan2(input.y||0,input.x||1);
  const px=p.x-state.cam.x,py=p.y-state.cam.y,tier=realmTier(state.level);
  if(tier>0){
    ctx.save();ctx.globalAlpha=.16+.03*tier;ctx.strokeStyle=tier>=3?'#ffd96a':'#8fffd0';ctx.lineWidth=3+tier;
    ctx.beginPath();ctx.arc(px,py,42+tier*8+Math.sin(state.t*3)*4,0,6.283);ctx.stroke();ctx.restore();
  }
  if(p.inv<=0||Math.floor(state.t*18)%2===0)drawSprite('player',p.x,p.y,84,84,aim,1);
  for(const d of state.damageText){
    ctx.globalAlpha=clamp(d.t/.65,0,1);ctx.fillStyle=d.crit?'#ffe36d':'#d9f8ff';ctx.font=d.crit?'900 22px Arial':'800 17px Arial';ctx.textAlign='center';ctx.fillText(d.text,d.x-state.cam.x,d.y-state.cam.y);
  }
  ctx.globalAlpha=1;ctx.restore();
  drawHud();
  if(state.flash>0){ctx.fillStyle='rgba(255,255,255,'+Math.min(.22,state.flash*2)+')';ctx.fillRect(0,0,W,H)}
  if(state.mode==='levelup')drawLevelUp();
  if(state.mode==='pause')drawPause();
  if(state.mode==='gameover')drawGameOver();
}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):(ctx.rect(x,y,w,h));}
function drawHud(){
  const p=state.player;
  ctx.save();
  ctx.fillStyle='rgba(7,16,13,.78)';roundRect(18,16,420,94,18);ctx.fill();
  ctx.fillStyle='#f5ead0';ctx.font='900 20px Arial';ctx.fillText(realm(state.level),34,42);
  ctx.fillStyle='#20352d';ctx.fillRect(34,53,300,15);ctx.fillStyle='#dc4d55';ctx.fillRect(34,53,300*clamp(p.hp/p.maxHp,0,1),15);
  ctx.fillStyle='#fff';ctx.font='800 12px Arial';ctx.fillText(Math.ceil(p.hp)+' / '+Math.ceil(p.maxHp),346,65);
  ctx.fillStyle='#213a31';ctx.fillRect(34,78,360,11);ctx.fillStyle='#e5c558';ctx.fillRect(34,78,360*clamp(state.xp/state.xpNeed,0,1),11);
  ctx.fillStyle='#d9cfad';ctx.font='800 11px Arial';ctx.fillText('LV '+state.level+'   '+state.xp+' / '+state.xpNeed+' EXP',34,104);
  ctx.fillStyle='rgba(7,16,13,.78)';roundRect(W-360,16,340,82,18);ctx.fill();
  ctx.fillStyle='#e5c558';ctx.font='900 16px Arial';ctx.fillText('◈ '+p.spirit+' Linh Thạch',W-338,43);
  ctx.fillStyle='#b8d5c2';ctx.font='800 13px Arial';ctx.fillText('Kiếm +'+p.swordLv+'   Giáp +'+p.armorLv+'   Ngọc +'+p.jadeLv,W-338,67);
  ctx.fillText('Hạ '+state.kills+'   Điểm '+state.score+'   Đợt '+state.wave,W-338,88);
  ctx.fillStyle='rgba(4,10,8,.72)';roundRect(18,H-52,840,34,14);ctx.fill();
  ctx.fillStyle='#c9d7cf';ctx.font='800 12px Arial';ctx.fillText('L Di chuyển  ·  R Ưu tiên hướng đánh  ·  A/R2 Tăng nhịp kiếm  ·  X Dash  ·  Y Linh Bạo  ·  START Tạm dừng  ·  B Thoát',32,H-30);
  if(state.messageT>0){ctx.textAlign='center';ctx.font='900 28px Arial';ctx.fillStyle='#ffe58d';ctx.fillText(state.message,W/2,135);ctx.textAlign='left'}
  drawBossBar();
  drawMinimap();
  ctx.restore();
}
function drawBossBar(){
  let boss=null;
  for(const e of state.enemies){if(e.boss&&!e.dead){boss=e;break}}
  if(!boss)return;
  const w=520,x=(W-w)/2,y=22,pct=clamp(boss.hp/boss.maxHp,0,1);
  ctx.fillStyle='rgba(25,7,7,.86)';roundRect(x,y,w,34,14);ctx.fill();
  ctx.fillStyle='#4a1719';ctx.fillRect(x+8,y+18,w-16,9);
  ctx.fillStyle='#e6534f';ctx.fillRect(x+8,y+18,(w-16)*pct,9);
  const name=boss.type==='guardian'?'THANH MỘC LINH TÔN':'HUYẾT NHA TRƯ YÊU';
  ctx.textAlign='center';ctx.fillStyle='#ffe3a1';ctx.font='900 13px Arial';ctx.fillText(name+' · '+Math.ceil(boss.hp)+' / '+Math.ceil(boss.maxHp),W/2,y+14);ctx.textAlign='left';
}
function drawMinimap(){
  const x=W-170,y=130,r=74,p=state.player;ctx.save();ctx.translate(x,y);
  ctx.fillStyle='rgba(5,13,10,.72)';ctx.beginPath();ctx.arc(0,0,r,0,6.283);ctx.fill();ctx.strokeStyle='#b99e65';ctx.lineWidth=2;ctx.stroke();
  const sx=r*1.65/WORLD_W,sy=r*1.65/WORLD_H;
  ctx.fillStyle='#ff5b58';let n=0;for(const e of state.enemies){if(n++>22)break;ctx.beginPath();ctx.arc((e.x-p.x)*sx,(e.y-p.y)*sy,e.boss?4:2,0,6.283);ctx.fill()}
  ctx.fillStyle='#d9fff0';ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(6,7);ctx.lineTo(0,4);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.restore();
}
function drawLevelUp(){
  ctx.fillStyle='rgba(3,8,6,.84)';ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';ctx.fillStyle='#ffe6a0';ctx.font='900 42px Arial';ctx.fillText('CẢNH GIỚI TĂNG TIẾN',W/2,128);
  ctx.fillStyle='#a9cab5';ctx.font='700 17px Arial';ctx.fillText('Chọn 1 công pháp · ← → / D-pad · A xác nhận',W/2,158);
  const cw=300,ch=280,gap=28,start=W/2-(cw*3+gap*2)/2;
  for(let i=0;i<state.choices.length;i++){
    const u=state.choices[i],x=start+i*(cw+gap),sel=i===state.choice;
    ctx.fillStyle=sel?'rgba(95,75,28,.95)':'rgba(13,31,24,.95)';roundRect(x,205,cw,ch,22);ctx.fill();
    ctx.strokeStyle=sel?'#ffd85b':'#58735f';ctx.lineWidth=sel?5:2;roundRect(x,205,cw,ch,22);ctx.stroke();
    ctx.fillStyle=sel?'#ffe585':'#dce8df';ctx.font='900 28px Arial';ctx.fillText(u.name,x+cw/2,265);
    const lv=state.player.up[u.id]||0;ctx.fillStyle='#8fbba0';ctx.font='800 14px Arial';ctx.fillText('Lv.'+lv+' → Lv.'+(lv+1),x+cw/2,298);
    ctx.fillStyle='#d0dbd4';ctx.font='700 16px Arial';wrapText(u.desc,x+cw/2,350,240,24);
    ctx.fillStyle='#6a806f';ctx.font='800 13px Arial';ctx.fillText('Tối đa Lv.'+u.max,x+cw/2,452);
  }
  ctx.textAlign='left';
}
function wrapText(text,x,y,maxWidth,lineHeight){
  const words=text.split(' ');let line='';
  for(let n=0;n<words.length;n++){const test=line+words[n]+' ';if(ctx.measureText(test).width>maxWidth&&n>0){ctx.fillText(line,x,y);line=words[n]+' ';y+=lineHeight}else line=test}ctx.fillText(line,x,y)
}
function drawPause(){
  ctx.fillStyle='rgba(3,8,6,.78)';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#ffe6a0';ctx.font='900 48px Arial';ctx.fillText('TẠM DỪNG',W/2,H/2-25);ctx.fillStyle='#d2ddd6';ctx.font='700 19px Arial';ctx.fillText('START / A tiếp tục · B thoát GAME 02',W/2,H/2+22);ctx.textAlign='left';
}
function drawGameOver(){
  ctx.fillStyle='rgba(8,4,5,.82)';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#ffcf78';ctx.font='900 52px Arial';ctx.fillText('ĐẠO TÂM TAN VỠ',W/2,H/2-70);ctx.fillStyle='#e7ddd0';ctx.font='800 20px Arial';ctx.fillText(realm(state.level)+' · Hạ '+state.kills+' · '+state.score+' điểm',W/2,H/2-20);ctx.fillText('A chơi lại · B trở về Game Center',W/2,H/2+38);ctx.textAlign='left';
}

function handleModeInput(){
  if(input.bEdge){stop();onExit?.();return true}
  if(state.mode==='levelup'){
    if(input.leftEdge)state.choice=(state.choice+state.choices.length-1)%state.choices.length;
    if(input.rightEdge)state.choice=(state.choice+1)%state.choices.length;
    if(input.aEdge&&state.choices[state.choice])applyUpgrade(state.choices[state.choice]);
    return true;
  }
  if(state.mode==='gameover'){if(input.aEdge)reset();return true}
  if(input.startEdge){state.mode=state.mode==='pause'?'play':'pause';return true}
  if(state.mode==='pause'){if(input.aEdge)state.mode='play';return true}
  return false;
}
function frame(t){
  if(!running)return;raf=requestAnimationFrame(frame);
  const dt=lastFrame?Math.min(MAX_DT,Math.max(.001,(t-lastFrame)/1000)):1/60;lastFrame=t;frameAvg=frameAvg*.94+dt*.06;
  readInput();const consumed=handleModeInput();if(!running)return;
  if(!consumed)update(dt);draw();
}
function keyDown(e){if(!running)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' ','Escape','x','y','p'].includes(e.key)){e.preventDefault();keys.add(e.key);if(!e.repeat)pressed.add(e.key)}}
function keyUp(e){if(running)keys.delete(e.key)}
function start(opts={}){
  stop();onExit=typeof opts.onExit==='function'?opts.onExit:null;const root=opts.root||document.getElementById('panelBody');if(!root)return;
  root.innerHTML='<div class="cf-game"><canvas id="cfCanvas" width="1280" height="720"></canvas></div>';
  canvas=document.getElementById('cfCanvas');ctx=canvas?.getContext('2d',{alpha:false,desynchronized:true});if(!ctx)return;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='medium';preload();reset();running=true;lastFrame=0;
  document.body.classList.add('game-running');document.getElementById('appPanel')?.classList.add('game-running','custom-game-running');window.tvGameActive=true;window.TVInput?.setGameMode?.(true);
  document.addEventListener('keydown',keyDown,true);document.addEventListener('keyup',keyUp,true);window.requestTVFullscreen?.();raf=requestAnimationFrame(frame);
}
function stop(){
  if(!running&& !canvas)return;
  if(state?.player)saveMeta();
  running=false;cancelAnimationFrame(raf);raf=0;keys.clear();pressed.clear();
  document.removeEventListener('keydown',keyDown,true);document.removeEventListener('keyup',keyUp,true);
  document.body.classList.remove('game-running');document.getElementById('appPanel')?.classList.remove('game-running','custom-game-running');window.tvGameActive=false;window.TVInput?.setGameMode?.(false);
  canvas=null;ctx=null;state=null;lastFrame=0;
}
window.CustomTVGames.cultivationForest={start,stop};
})();