(function(){
'use strict';
const $=id=>document.getElementById(id);
window.tvGameActive=false;

const GAMES=[
  {
    id:'high-on-track',
    title:'High On Track',
    icon:'🏎️',
    badge:'3D RACING',
    genre:'Đua xe · 3D low-poly',
    desc:'10 đường đua, xe nâng cấp, vật lý arcade và hỗ trợ gamepad.',
    url:'https://scrwl.itch.io/high-on-track',
    theme:'racing'
  },
  {
    id:'vampire-survivors',
    title:'Vampire Survivors',
    icon:'🧛',
    badge:'ACTION',
    genre:'Survival · Roguelite',
    desc:'Sinh tồn giữa hàng ngàn quái vật; bản HTML5 chơi trực tiếp bằng gamepad.',
    url:'https://poncle.itch.io/vampire-survivors',
    theme:'survival'
  },
  {
    id:'vapor-trails',
    title:'Vapor Trails',
    icon:'⚡',
    badge:'ACTION',
    genre:'Cyberpunk · Metroidvania',
    desc:'Action tốc độ cao, pixel-art đẹp, nhiều kỹ năng và hỗ trợ gamepad.',
    url:'https://sevencrane.itch.io/vapor-trails',
    theme:'cyber'
  },
  {
    id:'fohh',
    title:'Fohh',
    icon:'🦖',
    badge:'ADVENTURE',
    genre:'Platformer · Metroidvania',
    desc:'Phiêu lưu Unity với hiệu ứng parallax, khám phá và chiến đấu bằng gamepad.',
    url:'https://ismaelrodriguez.itch.io/fohh',
    theme:'adventure'
  },
  {
    id:'turbo-outrun',
    title:'Turbo OutRun Reimagined',
    icon:'🌆',
    badge:'ARCADE RACING',
    genre:'Pseudo-3D · Racing',
    desc:'Đua xe phong cách arcade cổ điển, joystick + trigger + nút A/X/Y đầy đủ.',
    url:'https://sk1ds.itch.io/outrun-clone',
    theme:'retro'
  },
  {
    id:'nymphiad',
    title:'Nymphiad',
    icon:'🏛️',
    badge:'PUZZLE',
    genre:'Puzzle · Platformer',
    desc:'Thế giới thay đổi theo camera, thiết kế đẹp và hỗ trợ gamepad đầy đủ.',
    url:'https://wolod.itch.io/nymphiad',
    theme:'temple'
  },
  {
    id:'virtuous-vanquisher',
    title:'Virtuous Vanquisher of Evil',
    icon:'⚔️',
    badge:'RPG',
    genre:'Hack & Slash · Roguelike',
    desc:'Dungeon crawler, loot động, boss cổ điển và hỗ trợ gamepad trong browser.',
    url:'https://ironchestgames.itch.io/virtuous-vanquisher-of-evil',
    theme:'rpg'
  }
];

function gameCard(g,featured=false){
  return '<button class="html5-game-card focusable'+(featured?' featured':'')+'" data-html5-game="'+g.id+'" data-theme="'+g.theme+'">'+
    '<span class="html5-cover" aria-hidden="true"><span class="html5-icon">'+g.icon+'</span><span class="html5-badge">'+g.badge+'</span></span>'+
    '<span class="html5-info">'+
      '<strong>'+escapeHtml(g.title)+'</strong>'+
      '<span class="html5-genre">'+escapeHtml(g.genre)+'</span>'+
      '<span class="html5-desc">'+escapeHtml(g.desc)+'</span>'+
      '<span class="html5-play">A / OK · CHƠI NGAY</span>'+
    '</span>'+
  '</button>';
}

function launchGame(id){
  const game=GAMES.find(g=>g.id===id);
  if(!game)return;
  try{
    localStorage.setItem('tvReturnToGameCenter','1');
    localStorage.setItem('tvLastHtml5Game',game.id);
  }catch{}
  window.TVInput?.setGameMode?.(false);
  window.tvGameActive=false;
  window.showToast?.('Đang mở '+game.title+'…');
  setTimeout(()=>location.assign(game.url),80);
}

window.renderGameApp=function(){
  window.TVInput?.setGameMode?.(true);
  window.tvGameActive=false;
  const root=$('panelBody');
  const last=localStorage.getItem('tvLastHtml5Game')||'';

  root.innerHTML=
    '<div class="html5-game-hub">'+
      '<div class="html5-game-header">'+
        '<div><p class="html5-kicker">HTML5 · GAMEPAD · KHÔNG CẦN CÀI</p>'+
        '<h3>Game đồ họa đẹp cho TV</h3>'+
        '<p>D-pad chọn · A/OK mở · nếu trang game hiện “Run game”, nhấn A/OK thêm một lần · Remote Back để quay lại.</p></div>'+
        '<div class="html5-controller">🎮 <strong>F710</strong><span>XInput</span></div>'+
      '</div>'+
      '<div class="html5-game-grid">'+GAMES.map(g=>gameCard(g,g.id===last)).join('')+'</div>'+
    '</div>';

  root.querySelectorAll('[data-html5-game]').forEach(btn=>{
    btn.addEventListener('click',()=>launchGame(btn.dataset.html5Game));
  });

  setTimeout(()=>root.querySelector('[data-html5-game]')?.focus(),40);
};

window.stopActiveGame=function(){
  window.tvGameActive=false;
};

})();