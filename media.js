(function(){
'use strict';
const $=id=>document.getElementById(id);
let hls=null;

function parseM3U(text){
  const lines=String(text||'').split(/\r?\n/),out=[];let name='';
  lines.forEach(line=>{line=line.trim();if(!line)return;if(line.startsWith('#EXTINF:')){const i=line.lastIndexOf(',');name=i>=0?line.slice(i+1).trim():'Kênh'}else if(line[0]!=='#'){out.push({name:name||('Kênh '+(out.length+1)),url:line});name=''}});
  return out.slice(0,500);
}
function playStream(video,url){
  if(!url)return showToast('Chưa có URL kênh');
  try{if(hls){hls.destroy();hls=null}}catch{}
  if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=url;video.play().catch(()=>showToast('Không phát được stream'))}
  else if(window.Hls&&Hls.isSupported()){hls=new Hls({enableWorker:true,lowLatencyMode:true});hls.loadSource(url);hls.attachMedia(video);hls.on(Hls.Events.MANIFEST_PARSED,()=>video.play().catch(()=>{}));hls.on(Hls.Events.ERROR,(e,d)=>{if(d.fatal)showToast('Stream lỗi hoặc bị chặn')})}
  else{video.src=url;video.play().catch(()=>showToast('Browser không hỗ trợ stream này'))}
}
window.renderTVApp=function(){
  const root=document.getElementById('panelBody');
  root.innerHTML='<div class="tv-layout">'+
    '<div class="player-card"><video id="tvVideo" class="video-player" controls playsinline></video><div class="tool-row"><input id="streamUrl" class="focusable" type="url" placeholder="URL kênh .m3u8 / MP4"><button id="playStream" class="btn primary focusable">▶ Phát</button></div><div id="tvStatus" class="status">Nhập URL kênh hoặc chọn một kênh từ playlist M3U.</div></div>'+
    '<div class="side-card"><h3>Danh sách kênh</h3><textarea id="m3uText" class="focusable" placeholder="Dán nội dung M3U vào đây..."></textarea><div class="tool-row"><input id="m3uFile" class="focusable" type="file" accept=".m3u,.m3u8,text/plain"><button id="parseM3U" class="btn focusable">Đọc playlist</button></div><div id="channelList" class="channel-list"></div></div>'+
    '</div>';
  const video=$('tvVideo'),list=$('channelList');
  $('playStream').onclick=()=>playStream(video,$('streamUrl').value.trim());
  function draw(text){const ch=parseM3U(text);list.innerHTML=ch.map((c,i)=>'<button class="btn channel-btn focusable" data-i="'+i+'">'+escapeHtml(c.name)+'</button>').join('');list.querySelectorAll('button').forEach(b=>b.onclick=()=>{const c=ch[Number(b.dataset.i)];$('streamUrl').value=c.url;$('tvStatus').textContent='Đang phát: '+c.name;playStream(video,c.url)});showToast('Đã đọc '+ch.length+' kênh')}
  $('parseM3U').onclick=()=>draw($('m3uText').value);
  $('m3uFile').onchange=function(){const f=this.files&&this.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('m3uText').value=String(r.result||'');draw(r.result)};r.readAsText(f)};
};

function extractYouTube(input){
  const v=String(input||'').trim();
  if(!v)return null;
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
function saveRecent(input){let r=[];try{r=JSON.parse(localStorage.getItem('ytRecentV5'))||[]}catch{};r=[input,...r.filter(x=>x!==input)].slice(0,8);localStorage.setItem('ytRecentV5',JSON.stringify(r));return r}
function getRecent(){try{return JSON.parse(localStorage.getItem('ytRecentV5'))||[]}catch{return[]}}
window.renderYouTubeApp=function(){
  const root=document.getElementById('panelBody');
  root.innerHTML='<div class="youtube-card"><iframe id="ytFrame" class="youtube-frame" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen tabindex="0"></iframe>'+
  '<div class="tool-row"><input id="ytInput" class="focusable" type="text" placeholder="Dán link YouTube, playlist hoặc Video ID"><button id="ytPlay" class="btn primary focusable">▶ Phát YouTube</button></div>'+
  '<div class="status">YouTube được phát ngay trong TV Home. Dùng chuột/remote để điều khiển player.</div><div id="ytRecent" class="recent-list"></div></div>';
  const frame=$('ytFrame'),recent=$('ytRecent');
  function drawRecent(){const arr=getRecent();recent.innerHTML=arr.map((x,i)=>'<button class="btn recent-chip focusable" data-i="'+i+'">Gần đây '+(i+1)+'</button>').join('');recent.querySelectorAll('button').forEach(b=>b.onclick=()=>{$('ytInput').value=arr[Number(b.dataset.i)];play()})}
  function play(){const raw=$('ytInput').value.trim(),o=extractYouTube(raw);if(!o)return showToast('Link/ID YouTube không hợp lệ');frame.src=o.type==='video'?'https://www.youtube.com/embed/'+encodeURIComponent(o.id)+'?autoplay=1&rel=0':'https://www.youtube.com/embed/videoseries?list='+encodeURIComponent(o.id)+'&autoplay=1';saveRecent(raw);drawRecent()}
  $('ytPlay').onclick=play;$('ytInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();play()}});drawRecent();
};
})();