(function(){
'use strict';
const $=id=>document.getElementById(id);
let game='snake',canvas=null,ctx=null,raf=0,timer=0,keys={},snakeState=null,pongState=null,g2048=null;
window.tvGameActive=false;

window.renderGameApp=function(){
  const root=$('panelBody');
  root.innerHTML='<div class="game-card"><div class="game-select">'+
    '<button class="btn game-choice focusable" data-game="snake">🐍 Snake</button>'+
    '<button class="btn game-choice focusable" data-game="pong">🏓 Pong</button>'+
    '<button class="btn game-choice focusable" data-game="2048">🔢 2048</button>'+
    '</div><div class="game-hud"><span id="gameScore">Điểm: 0</span><span id="gameState">Chọn game để bắt đầu</span></div><div id="gameStage" class="game-stage"></div><div class="game-help">Remote/F710: D-pad hoặc analog trái để chơi · A/OK chọn · B thoát · X/Start chơi lại · Y/R1/R2 game kế · L1/L2 game trước.</div></div>';
  document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>startGame(b.dataset.game));
  startGame('snake');
};
function cleanup(){cancelAnimationFrame(raf);clearInterval(timer);raf=0;timer=0;keys={};window.tvGameActive=false}
window.stopActiveGame=cleanup;

function startGame(name){cleanup();game=name;window.tvGameActive=true;$('gameState').textContent=name==='snake'?'Snake':'Đang chơi '+name;if(name==='snake')startSnake();if(name==='pong')startPong();if(name==='2048')start2048()}

function cycleGame(delta){const list=['snake','pong','2048'];const i=Math.max(0,list.indexOf(game));startGame(list[(i+delta+list.length)%list.length])}\nfunction setupCanvas(w=800,h=480){const stage=$('gameStage');stage.innerHTML='<canvas id="gameCanvas" width="'+w+'" height="'+h+'"></canvas>';canvas=$('gameCanvas');ctx=canvas.getContext('2d');return canvas}
function drawBg(){ctx.fillStyle='#050b12';ctx.fillRect(0,0,canvas.width,canvas.height)}

function startSnake(){
  setupCanvas(800,480);snakeState={body:[{x:10,y:10},{x:9,y:10},{x:8,y:10}],dir:{x:1,y:0},next:{x:1,y:0},food:{x:18,y:10},score:0,over:false};
  const cell=24,cols=Math.floor(canvas.width/cell),rows=Math.floor(canvas.height/cell);
  function food(){snakeState.food={x:Math.floor(Math.random()*cols),y:Math.floor(Math.random()*rows)}}
  function step(){if(snakeState.over)return;snakeState.dir=snakeState.next;const h={x:snakeState.body[0].x+snakeState.dir.x,y:snakeState.body[0].y+snakeState.dir.y};if(h.x<0||h.y<0||h.x>=cols||h.y>=rows||snakeState.body.some(p=>p.x===h.x&&p.y===h.y)){snakeState.over=true;$('gameState').textContent='Game Over · nhấn OK để chơi lại';return}snakeState.body.unshift(h);if(h.x===snakeState.food.x&&h.y===snakeState.food.y){snakeState.score+=10;$('gameScore').textContent='Điểm: '+snakeState.score;food()}else snakeState.body.pop()}
  function draw(){drawBg();ctx.fillStyle='#ffcc33';ctx.fillRect(snakeState.food.x*cell+3,snakeState.food.y*cell+3,cell-6,cell-6);ctx.fillStyle='#48e59a';snakeState.body.forEach((p,i)=>ctx.fillRect(p.x*cell+2,p.y*cell+2,cell-4,cell-4));raf=requestAnimationFrame(draw)}
  timer=setInterval(step,120);draw();
}

function startPong(){
  setupCanvas(800,480);pongState={py:190,ai:190,bx:400,by:240,vx:5,vy:3,score:0,aiScore:0};
  function loop(){const p=pongState;if(keys.ArrowUp)p.py=Math.max(0,p.py-7);if(keys.ArrowDown)p.py=Math.min(380,p.py+7);p.ai+=(p.by-(p.ai+50))*.07;p.bx+=p.vx;p.by+=p.vy;if(p.by<8||p.by>472)p.vy*=-1;if(p.bx<32&&p.by>p.py&&p.by<p.py+100){p.vx=Math.abs(p.vx)+.15}if(p.bx>768&&p.by>p.ai&&p.by<p.ai+100){p.vx=-Math.abs(p.vx)-.15}if(p.bx<0){p.aiScore++;resetBall(1)}if(p.bx>800){p.score++;resetBall(-1)}$('gameScore').textContent='Bạn '+p.score+' : '+p.aiScore+' CPU';drawBg();ctx.fillStyle='#eef5ff';ctx.fillRect(20,p.py,12,100);ctx.fillRect(768,p.ai,12,100);ctx.beginPath();ctx.arc(p.bx,p.by,9,0,Math.PI*2);ctx.fill();raf=requestAnimationFrame(loop)}
  function resetBall(dir){p=pongState;p.bx=400;p.by=240;p.vx=5*dir;p.vy=(Math.random()>.5?3:-3)}
  loop();
}

function start2048(){
  const stage=$('gameStage');stage.innerHTML='<div id="board2048" class="game-board-2048"></div>';g2048=Array.from({length:4},()=>Array(4).fill(0));addTile();addTile();draw2048();$('gameState').textContent='Dùng phím mũi tên để ghép số';
}
function addTile(){const empty=[];for(let y=0;y<4;y++)for(let x=0;x<4;x++)if(!g2048[y][x])empty.push([x,y]);if(!empty.length)return;const [x,y]=empty[Math.floor(Math.random()*empty.length)];g2048[y][x]=Math.random()<.9?2:4}
function compress(arr){const a=arr.filter(Boolean);for(let i=0;i<a.length-1;i++)if(a[i]===a[i+1]){a[i]*=2;a[i+1]=0;i++}return a.filter(Boolean).concat(Array(4).fill(0)).slice(0,4)}
function move2048(dir){
  const before=JSON.stringify(g2048);
  if(dir==='left')g2048=g2048.map(compress);
  if(dir==='right')g2048=g2048.map(r=>compress([...r].reverse()).reverse());
  if(dir==='up'||dir==='down'){let n=Array.from({length:4},()=>Array(4).fill(0));for(let x=0;x<4;x++){let col=[];for(let y=0;y<4;y++)col.push(g2048[y][x]);if(dir==='down')col.reverse();col=compress(col);if(dir==='down')col.reverse();for(let y=0;y<4;y++)n[y][x]=col[y]}g2048=n}
  if(JSON.stringify(g2048)!==before){addTile();draw2048()}
}
function draw2048(){const b=$('board2048');if(!b)return;b.innerHTML='';let score=0;for(let y=0;y<4;y++)for(let x=0;x<4;x++){const v=g2048[y][x];score+=v;const d=document.createElement('div');d.className='tile2048';d.textContent=v||'';b.appendChild(d)}$('gameScore').textContent='Tổng: '+score}

document.addEventListener('keydown',e=>{
  if(!window.tvGameActive)return;
  const back=['Escape','BrowserBack','GoBack'].includes(e.key)||e.keyCode===4;
  if(back){e.preventDefault();cleanup();$('gameState').textContent='Đã thoát game · chọn game khác hoặc Quay lại';return}
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();keys[e.key]=true;if(game==='snake'&&snakeState&&!snakeState.over){const m={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}}[e.key],d=snakeState.dir;if(m.x!==-d.x||m.y!==-d.y)snakeState.next=m}if(game==='2048')move2048(e.key.replace('Arrow','').toLowerCase())}
  if((e.key==='Enter'||e.key===' ')&&game==='snake'&&snakeState?.over)startGame('snake');\n  if(e.key==='GamepadX'||e.key==='GamepadStart'||e.key==='GamepadL3')startGame(game);\n  if(e.key==='GamepadY'||e.key==='GamepadR1'||e.key==='GamepadR2'||e.key==='GamepadR3')cycleGame(1);\n  if(e.key==='GamepadL1'||e.key==='GamepadL2')cycleGame(-1);\n  if(e.key==='GamepadSelect'){cleanup();$('gameState').textContent='Đã thoát game · chọn game khác hoặc Quay lại'}
},true);
document.addEventListener('keyup',e=>{if(window.tvGameActive)keys[e.key]=false},true);
})();