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
          '<span class="custom-game-art"><img class="custom-game-poster" src="./games/game01-neon-arena/assets/poster.png" onerror="this.onerror=null;this.src=&quot;./games/game01-neon-arena/legacy-svg/poster.svg&quot;" alt=""><span class="custom-game-number">GAME 01</span><span class="custom-game-tag">ARENA ACTION</span></span>'+
          '<span class="custom-game-copy"><strong>NEON ARENA</strong><span>Survival · Auto-fire · Progression</span>'+
          '<em>Tự khóa mục tiêu và tự bắn. Lên cấp tăng hỏa lực, giữ combo, săn boss mỗi 5 wave; cần phải dùng để ưu tiên hướng ngắm, X dash, Y thả bom.</em>'+
          '<b>A / OK · CHƠI</b></span>'+
        '</button>'+
        '<button id="launchCultivationForest" class="custom-game-card focusable game02-card">'+
          '<span class="custom-game-art"><img class="custom-game-poster" src="./assets/game02/cultivation-forest/poster.svg" alt=""><span class="custom-game-number">GAME 02</span><span class="custom-game-tag">TU TIÊN SURVIVOR</span></span>'+
          '<span class="custom-game-copy"><strong>TU TIÊN LÂM CẢNH</strong><span>Horde Survival · Cảnh giới · Trang bị</span>'+
          '<em>Lang bạt trong đại lâm, diệt yêu thú và đạo phỉ, hấp thu linh khí để đột phá cảnh giới. Mỗi lần lên cấp chọn 1/3 công pháp; nhặt Linh Thạch, đan dược và trang bị để nâng Kiếm, Giáp, Ngọc. Có elite và Yêu Vương.</em>'+
          '<b>A / OK · CHƠI</b></span>'+
        '</button>'+
        '<button id="launchOmNomRun" class="custom-game-card focusable game04-card">'+
          '<span class="custom-game-art"><span class="omnom-mark" aria-hidden="true">OM<br>NOM<br><b>RUN</b></span><span class="custom-game-number">GAME 04</span><span class="custom-game-tag">FAMOBI · ENDLESS RUNNER</span></span>'+
          '<span class="custom-game-copy"><strong>OM NOM RUN</strong><span>3-Lane Runner · Missions · Power-ups</span>'+
          '<em>Bản web chính chủ Famobi. F710/D-pad: trái-phải đổi làn, lên nhảy, xuống trượt. Không sao chép mã nguồn hay asset vào repo; game được tải trực tiếp từ Famobi.</em>'+
          '<b>A / OK · MỞ GAME</b></span>'+
        '</button>'+
      '</div>'+
    '</div>';
  $('launchNeonArena')?.addEventListener('click',startNeonArena);
  $('launchCultivationForest')?.addEventListener('click',startCultivationForest);
  $('launchOmNomRun')?.addEventListener('click',startOmNomRun);
  setTimeout(()=>$('launchNeonArena')?.focus(),40);
}

function startNeonArena(){
  const game=window.CustomTVGames?.neonArena;
  if(!game)return window.showToast?.('Không tải được NEON ARENA');
  activeGame='neon-arena';
  game.start({root:$('panelBody'),onExit:renderMenu});
}

function startCultivationForest(){
  const game=window.CustomTVGames?.cultivationForest;
  if(!game)return window.showToast?.('Không tải được GAME 02');
  activeGame='cultivation-forest';
  game.start({root:$('panelBody'),onExit:renderMenu});
}

function startOmNomRun(){
  activeGame='';
  window.tvGameActive=false;
  window.TVInput?.setGameMode?.(false);
  window.location.href='https://play.famobi.com/om-nom-run';
}

window.renderGameApp=renderMenu;
window.stopActiveGame=function(){
  if(activeGame==='neon-arena')window.CustomTVGames?.neonArena?.stop?.();
  if(activeGame==='cultivation-forest')window.CustomTVGames?.cultivationForest?.stop?.();
  activeGame='';
  window.tvGameActive=false;
};

})();