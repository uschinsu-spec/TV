(function(){
'use strict';
const $=id=>document.getElementById(id);
let hls=null,currentVideo=null,currentChannel=null;

const VTV=[
  {name:'VTV1',urls:['https://vtvgolive-failover.vtvdigital.vn/vtvgo/vtv1-manifest.m3u8','https://live-a.fptplay53.net/live/media/vtv1/live247-hls-avc/index.m3u8']},
  {name:'VTV2',urls:['https://vtvgolive-failover.vtvdigital.vn/vtvgo/vtv2-manifest.m3u8','https://live-a.fptplay53.net/live/media/vtv2/live247-hls-avc/index.m3u8']},
  {name:'VTV3',urls:['https://vtvgolive-failover.vtvdigital.vn/vtvgo/vtv3-manifest.m3u8','https://live-a.fptplay53.net/live/media/vtv3/live247-hls-avc/index.m3u8']},
  {name:'VTV4',urls:['https://vtvgolive-failover.vtvdigital.vn/vtvgo/vtv4-manifest.m3u8','https://live-a.fptplay53.net/live/media/vtv4/live247-hls-avc/index.m3u8']},
  {name:'VTV5',urls:['https://vtvgolive-failover.vtvdigital.vn/vtvgo/vtv5-manifest.m3u8','https://live-a.fptplay53.net/live/media/vtv5/live247-hls-avc/index.m3u8']},
  {name:'VTV6',urls:['https://vtvgolive-failover.vtvdigital.vn/vtvgo/vtv6-manifest.m3u8','https://live-a.fptplay53.net/live/media/vtv6/live247-hls-avc/index.m3u8']},
  {name:'VTV7',urls:['https://vtvgolive-failover.vtvdigital.vn/vtvgo/vtv7-manifest.m3u8','https://live-a.fptplay53.net/live/media/vtv7/live247-hls-avc/index.m3u8']},
  {name:'VTV8',urls:['https://vtvgolive-failover.vtvdigital.vn/vtvgo/vtv8-manifest.m3u8','https://live-a.fptplay53.net/live/media/vtv8/live-hls-avc/index.m3u8']},
  {name:'VTV9',urls:['https://vtvgolive-failover.vtvdigital.vn/vtvgo/vtv9-manifest.m3u8','https://live-a.fptplay53.net/live/media/vtv9/live247-hls-avc/index.m3u8']}
];

function destroyHls(){try{if(hls){hls.destroy();hls=null}}catch{}}
function playUrl(video,urls,label,attempt=0){
  destroyHls();currentVideo=video;currentChannel=label;
  const url=Array.isArray(urls)?urls[attempt]:urls;
  if(!url)return showToast('Kênh hiện không phát được');
  const status=$('tvStatus');
  if(status)status.textContent='Đang tải '+label+'…';
  const fail=()=>{
    if(Array.isArray(urls)&&attempt+1<urls.length){
      if(status)status.textContent='Đổi nguồn dự phòng cho '+label+'…';
      playUrl(video,urls,label,attempt+1);
    }else{
      if(status)status.textContent=label+' hiện không phát được';
      showToast('Không phát được '+label);
    }
  };
  if(video.canPlayType('application/vnd.apple.mpegurl')){
    video.src=url;
    video.play().then(()=>{if(status)status.textContent='Đang xem '+label}).catch(fail);
  }else if(window.Hls&&Hls.isSupported()){
    hls=new Hls({enableWorker:true,lowLatencyMode:false,backBufferLength:12,maxBufferLength:20});
    hls.loadSource(url);hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED,()=>video.play().then(()=>{if(status)status.textContent='Đang xem '+label}).catch(()=>{}));
    hls.on(Hls.Events.ERROR,(e,d)=>{if(d.fatal)fail()});
  }else{
    video.src=url;video.play().catch(fail);
  }
}
function parseM3U(text){
  const lines=String(text||'').split(/\r?\n/),out=[];let name='';
  lines.forEach(line=>{
    line=line.trim();if(!line)return;
    if(line.startsWith('#EXTINF:')){
      const i=line.lastIndexOf(',');name=i>=0?line.slice(i+1).trim():'Kênh';
    }else if(line[0]!=='#'){
      out.push({name:name||('Kênh '+(out.length+1)),url:line});name='';
    }
  });
  return out.slice(0,200);
}

window.renderTVApp=function(){
  const root=$('panelBody');
  root.innerHTML=
    '<div class="tv-screen">'+
      '<div class="tv-video-wrap">'+
        '<video id="tvVideo" class="video-player" controls playsinline></video>'+
        '<div class="tv-now-row"><div id="tvStatus" class="tv-now">Đang mở VTV1…</div><button id="tvAdvancedToggle" class="btn compact focusable">⚙ Nguồn khác</button></div>'+
      '</div>'+
      '<div class="channel-strip" id="builtinChannels"></div>'+
      '<div id="tvAdvanced" class="tv-advanced" hidden>'+
        '<div class="tool-row"><input id="streamUrl" class="focusable" type="url" placeholder="URL .m3u8 / MP4"><button id="playStream" class="btn primary focusable">▶ Phát</button></div>'+
        '<div class="tool-row"><textarea id="m3uText" class="focusable" placeholder="Dán playlist M3U"></textarea><input id="m3uFile" class="focusable" type="file" accept=".m3u,.m3u8,text/plain"><button id="parseM3U" class="btn focusable">Đọc playlist</button></div>'+
        '<div id="customChannels" class="custom-channel-list"></div>'+
      '</div>'+
    '</div>';

  const video=$('tvVideo'),built=$('builtinChannels'),custom=$('customChannels'),advanced=$('tvAdvanced');
  built.innerHTML=VTV.map((c,i)=>'<button class="btn channel-btn focusable" data-i="'+i+'">'+c.name+'</button>').join('');

  function select(i){
    const c=VTV[i];
    built.querySelectorAll('button').forEach(x=>x.classList.toggle('active',Number(x.dataset.i)===i));
    playUrl(video,c.urls,c.name);
  }
  built.querySelectorAll('button').forEach(b=>b.onclick=()=>select(Number(b.dataset.i)));

  $('tvAdvancedToggle').onclick=()=>{
    advanced.hidden=!advanced.hidden;
    $('tvAdvancedToggle').textContent=advanced.hidden?'⚙ Nguồn khác':'✕ Đóng nguồn khác';
    if(!advanced.hidden)setTimeout(()=>$('streamUrl')?.focus(),20);
    else setTimeout(()=>built.querySelector('.active')?.focus(),20);
  };
  $('playStream').onclick=()=>{
    const u=$('streamUrl').value.trim();
    if(!u)return showToast('Nhập URL kênh');
    playUrl(video,u,'Kênh riêng');
  };
  function draw(text){
    const ch=parseM3U(text);
    custom.innerHTML=ch.map((c,i)=>'<button class="btn channel-btn focusable" data-i="'+i+'">'+escapeHtml(c.name)+'</button>').join('');
    custom.querySelectorAll('button').forEach(b=>b.onclick=()=>{
      const c=ch[Number(b.dataset.i)];
      $('streamUrl').value=c.url;playUrl(video,c.url,c.name);
    });
    showToast('Đã đọc '+ch.length+' kênh');
  }
  $('parseM3U').onclick=()=>draw($('m3uText').value);
  $('m3uFile').onchange=function(){
    const file=this.files&&this.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{$('m3uText').value=String(reader.result||'');draw(reader.result)};
    reader.readAsText(file);
  };
  setTimeout(()=>select(0),80);
};
window.stopTVPlayback=function(){
  destroyHls();
  try{if(currentVideo){currentVideo.pause();currentVideo.removeAttribute('src');currentVideo.load()}}catch{}
  currentVideo=null;currentChannel=null;
};

const YT_PRESETS=[
  {name:'VTV24 · Tin tức',id:'zZ3X0XomNRA'},
  {name:'VTV24 · Tổng hợp',id:'HDp4siaZjYQ'},
  {name:'VTV24 · Thời sự',id:'DkiCMiK6lxs'},
  {name:'VTV24 · Quốc tế',id:'XBlI4chorf8'}
];
function extractYouTube(input){
  const v=String(input||'').trim();if(!v)return null;
  try{
    const u=new URL(v);
    if(u.hostname.includes('youtu.be'))return{type:'video',id:u.pathname.replace('/','').split('/')[0]};
    if(u.hostname.includes('youtube.com')){
      const list=u.searchParams.get('list'),id=u.searchParams.get('v');
      if(list&&(!id||u.pathname.includes('playlist')))return{type:'playlist',id:list};
      if(id)return{type:'video',id};
      const m=u.pathname.match(/\/(shorts|embed)\/([^/?]+)/);if(m)return{type:'video',id:m[2]};
    }
  }catch{}
  if(/^[A-Za-z0-9_-]{11}$/.test(v))return{type:'video',id:v};
  if(/^PL[A-Za-z0-9_-]+$/.test(v))return{type:'playlist',id:v};
  return null;
}
function embedUrl(o){
  return o.type==='video'
    ?'https://www.youtube.com/embed/'+encodeURIComponent(o.id)+'?autoplay=1&rel=0&playsinline=1'
    :'https://www.youtube.com/embed/videoseries?list='+encodeURIComponent(o.id)+'&autoplay=1&rel=0';
}
function remember(raw){
  localStorage.setItem('ytLastV7',raw);
  let arr=[];try{arr=JSON.parse(localStorage.getItem('ytRecentV7'))||[]}catch{}
  arr=[raw,...arr.filter(x=>x!==raw)].slice(0,6);
  localStorage.setItem('ytRecentV7',JSON.stringify(arr));return arr;
}
function recent(){try{return JSON.parse(localStorage.getItem('ytRecentV7'))||[]}catch{return[]}}

window.renderYouTubeApp=function(){
  const root=$('panelBody');
  root.innerHTML=
    '<div class="youtube-screen">'+
      '<iframe id="ytFrame" class="youtube-frame" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen tabindex="-1"></iframe>'+
      '<div class="youtube-control-row">'+
        '<div class="youtube-presets" id="ytPresets"></div>'+
        '<button id="ytMoreBtn" class="btn focusable">⌨ Nhập link</button>'+
      '</div>'+
      '<div id="ytMore" class="youtube-more" hidden>'+
        '<div class="tool-row"><input id="ytInput" class="focusable" type="text" placeholder="Link YouTube / playlist / Video ID"><button id="ytPlay" class="btn primary focusable">▶ Xem</button></div>'+
        '<div id="ytRecent" class="recent-list"></div>'+
      '</div>'+
    '</div>';

  const frame=$('ytFrame'),presets=$('ytPresets'),rec=$('ytRecent'),more=$('ytMore');
  presets.innerHTML=YT_PRESETS.map((p,i)=>'<button class="btn yt-preset focusable" data-i="'+i+'">▶ '+escapeHtml(p.name)+'</button>').join('');

  function setRaw(raw,save=true){
    const o=extractYouTube(raw);
    if(!o)return showToast('Link/ID YouTube không hợp lệ');
    frame.src=embedUrl(o);
    if($('ytInput'))$('ytInput').value=raw;
    if(save){remember(raw);drawRecent()}
  }
  presets.querySelectorAll('button').forEach(b=>b.onclick=()=>setRaw(YT_PRESETS[Number(b.dataset.i)].id));

  function drawRecent(){
    const arr=recent();
    rec.innerHTML=arr.map((x,i)=>'<button class="btn recent-chip focusable" data-i="'+i+'">Gần đây '+(i+1)+'</button>').join('');
    rec.querySelectorAll('button').forEach(b=>b.onclick=()=>setRaw(arr[Number(b.dataset.i)]));
  }
  $('ytMoreBtn').onclick=()=>{
    more.hidden=!more.hidden;
    $('ytMoreBtn').textContent=more.hidden?'⌨ Nhập link':'✕ Đóng';
    if(!more.hidden)setTimeout(()=>$('ytInput')?.focus(),20);
    else setTimeout(()=>presets.querySelector('button')?.focus(),20);
  };
  $('ytPlay').onclick=()=>setRaw($('ytInput').value.trim());
  $('ytInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();setRaw($('ytInput').value.trim())}});
  drawRecent();
  setRaw(localStorage.getItem('ytLastV7')||localStorage.getItem('ytLastV6')||YT_PRESETS[0].id,false);
};
})();