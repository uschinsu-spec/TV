(function(){
'use strict';
const $=id=>document.getElementById(id);
let activeGame='';

function renderMenu(){
  window.tvGameActive=false;
  window.TVInput?.setGameMode?.(false);
  activeGame='';
  const root=$('panelBody');if(!root)return;
  root.innerHTML=
    '<div class="custom-game-library">'+
      '<div class="custom-game-library-head">'+
        '<div><p class="custom-game-kicker">GAME TỰ TẠO · CONTROLLER FIRST</p>'+
        '<h3>Thư viện game của bạn</h3>'+
        '<p>Game ngoài đã được gỡ. Từ đây chỉ thêm các game tự thiết kế tối ưu riêng cho TV và F710.</p></div>'+
        '<div class="custom-pad-badge">🎮 <b>F710</b><span>XInput</span></div>'+
      '</div>'+
      '<div class="custom-game-list">'+
        '<button id="launchNeonArena" class="custom-game-card focusable">'+
          '<span class="custom-game-art"><img class="custom-game-poster" src="./assets/game01/neon-arena/poster.svg" alt=""><span class="custom-game-number">GAME 01</span><span class="custom-game-tag">ARENA ACTION</span></span>'+
          '<span class="custom-game-copy"><strong>NEON ARENA</strong><span>Survival · Auto-fire · Progression</span>'+
          '<em>Tự khóa mục tiêu và tự bắn. Lên cấp tăng hỏa lực, giữ combo, săn boss mỗi 5 wave; cần phải dùng để ưu tiên hướng ngắm, X dash, Y thả bom.</em>'+
          '<b>A / OK · CHƠI</b></span>'+
        '</button>'+
        '<div class="custom-game-coming"><span>+</span><strong>GAME 02</strong><small>Chỗ dành cho game tiếp theo của bạn</small></div>'+
      '</div>'+
    '</div>';
  $('launchNeonArena')?.addEventListener('click',startNeonArena);
  setTimeout(()=>$('launchNeonArena')?.focus(),40);
}

function startNeonArena(){
  const game=window.CustomTVGames?.neonArena;
  if(!game)return window.showToast?.('Không tải được NEON ARENA');
  activeGame='neon-arena';
  game.start({root:$('panelBody'),onExit:renderMenu});
}

window.renderGameApp=renderMenu;
window.stopActiveGame=function(){
  if(activeGame==='neon-arena')window.CustomTVGames?.neonArena?.stop?.();
  activeGame='';
  window.tvGameActive=false;
};

})();