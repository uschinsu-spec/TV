(function(){
'use strict';
var dialog=document.getElementById('directToolDialog');
var title=document.getElementById('directToolTitle');
var subtitle=document.getElementById('directToolSubtitle');
var body=document.getElementById('directToolBody');
var currentTool='';
var timerState={end:0,remain:300000,running:false,tick:null};
var watchState={start:0,elapsed:0,running:false,tick:null};
var calendarDate=new Date();
var screenOverlay=null;
var mediaObjectUrls=[];
var meta={
timer:['Timer','Đếm ngược ngay trên TV'],
stopwatch:['Stopwatch','Bấm giờ chính xác theo mili-giây'],
calculator:['Máy tính','Tính toán bằng remote'],
calendar:['Lịch','Xem lịch tháng ngay trên TV'],
notes:['Ghi chú','Lưu trực tiếp trong bộ nhớ trình duyệt TV'],
video:['Video Player','Phát video từ bộ nhớ/USB hoặc URL media'],
music:['Music Player','Phát nhạc từ bộ nhớ/USB hoặc URL audio'],
iptv:['IPTV Player','Phát stream và đọc danh sách M3U ngay trong Hub'],
network:['Test mạng','Kiểm tra trạng thái, RTT và tốc độ phản hồi GitHub Pages'],
screen:['Test màn hình','Màu đơn, gradient và checkerboard toàn màn hình'],
speaker:['Test loa','Phát tone kiểm tra loa trái, phải hoặc cả hai'],
remote:['Test remote','Hiển thị phím và mã phím từ remote Xiaomi']
};
function fmt(ms,withMs){
ms=Math.max(0,ms);
var h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000),x=Math.floor((ms%1000)/10);
var base=(h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
return withMs?base+'.'+String(x).padStart(2,'0'):base;
}
function beep(freq,pan,duration){
try{
var C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error('unsupported');
var ctx=new C(),osc=ctx.createOscillator(),gain=ctx.createGain();
osc.frequency.value=freq||660;gain.gain.setValueAtTime(.0001,ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(.18,ctx.currentTime+.02);
gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+(duration||.7));
if(ctx.createStereoPanner){var p=ctx.createStereoPanner();p.pan.value=pan||0;osc.connect(gain);gain.connect(p);p.connect(ctx.destination)}
else{osc.connect(gain);gain.connect(ctx.destination)}
osc.start();osc.stop(ctx.currentTime+(duration||.7)+.03);
setTimeout(function(){ctx.close().catch(function(){})},Math.ceil((duration||.7)*1000)+250);
}catch(e){showToast('Trình duyệt TV không hỗ trợ Web Audio')}
}
function openTool(name,button){
currentTool=name;var m=meta[name]||['Tiện ích',''];title.textContent=m[0];subtitle.textContent=m[1];render(name);openDialog(dialog,button);
}
function render(name){
if(name==='timer')renderTimer();
else if(name==='stopwatch')renderStopwatch();
else if(name==='calculator')renderCalculator();
else if(name==='calendar')renderCalendar();
else if(name==='notes')renderNotes();
else if(name==='video')renderVideo();
else if(name==='music')renderMusic();
else if(name==='iptv')renderIPTV();
else if(name==='network')renderNetwork();
else if(name==='screen')renderScreen();
else if(name==='speaker')renderSpeaker();
else if(name==='remote')renderRemote();
}
function renderTimer(){
body.innerHTML='<div class="tool-panel"><div id="timerDisplay" class="tool-display">'+fmt(timerState.running?timerState.end-Date.now():timerState.remain,false)+'</div><div class="tool-row"><input id="timerMinutes" class="focusable" type="number" min="0.1" step="0.5" value="'+Math.max(.1,timerState.remain/60000).toFixed(1)+'" aria-label="Số phút"><button id="timerSet" class="btn focusable">Đặt phút</button></div><div class="tool-row"><button id="timerStart" class="btn primary focusable">'+(timerState.running?'Tạm dừng':'Bắt đầu')+'</button><button id="timerReset" class="btn focusable">Đặt lại 5 phút</button><button class="btn focusable timer-preset" data-ms="60000">1 phút</button><button class="btn focusable timer-preset" data-ms="300000">5 phút</button><button class="btn focusable timer-preset" data-ms="900000">15 phút</button></div><div class="tool-status">Timer vẫn chạy khi đóng cửa sổ công cụ, miễn TV Hub còn mở.</div></div>';
var display=document.getElementById('timerDisplay');
function paint(){if(!display||!document.body.contains(display))return;display.textContent=fmt(timerState.running?timerState.end-Date.now():timerState.remain,false)}
clearInterval(timerState.tick);
timerState.tick=setInterval(function(){if(timerState.running&&timerState.end-Date.now()<=0){timerState.running=false;timerState.remain=0;clearInterval(timerState.tick);beep(880,0,1.2);showToast('Timer đã hết giờ')}paint()},250);
document.getElementById('timerSet').onclick=function(){var min=parseFloat(document.getElementById('timerMinutes').value);if(!isFinite(min)||min<=0)return showToast('Số phút không hợp lệ');timerState.running=false;timerState.remain=Math.round(min*60000);paint()};
document.getElementById('timerStart').onclick=function(){if(timerState.running){timerState.remain=Math.max(0,timerState.end-Date.now());timerState.running=false;this.textContent='Bắt đầu'}else{if(timerState.remain<=0)timerState.remain=300000;timerState.end=Date.now()+timerState.remain;timerState.running=true;this.textContent='Tạm dừng'}paint()};
document.getElementById('timerReset').onclick=function(){timerState.running=false;timerState.remain=300000;document.getElementById('timerMinutes').value='5.0';document.getElementById('timerStart').textContent='Bắt đầu';paint()};
Array.prototype.forEach.call(body.querySelectorAll('.timer-preset'),function(b){b.onclick=function(){timerState.running=false;timerState.remain=Number(b.dataset.ms);document.getElementById('timerMinutes').value=(timerState.remain/60000).toFixed(1);document.getElementById('timerStart').textContent='Bắt đầu';paint()}});
}
function renderStopwatch(){
body.innerHTML='<div class="tool-panel"><div id="watchDisplay" class="tool-display">'+fmt(watchState.elapsed,true)+'</div><div class="tool-row"><button id="watchStart" class="btn primary focusable">'+(watchState.running?'Tạm dừng':'Bắt đầu')+'</button><button id="watchReset" class="btn focusable">Đặt lại</button></div></div>';
var d=document.getElementById('watchDisplay');
function paint(){if(d&&document.body.contains(d))d.textContent=fmt(watchState.elapsed+(watchState.running?Date.now()-watchState.start:0),true)}
clearInterval(watchState.tick);watchState.tick=setInterval(paint,31);
document.getElementById('watchStart').onclick=function(){if(watchState.running){watchState.elapsed+=Date.now()-watchState.start;watchState.running=false;this.textContent='Bắt đầu'}else{watchState.start=Date.now();watchState.running=true;this.textContent='Tạm dừng'}paint()};
document.getElementById('watchReset').onclick=function(){watchState.running=false;watchState.elapsed=0;document.getElementById('watchStart').textContent='Bắt đầu';paint()};
}
function calcValue(text){
var s=String(text||'').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/\s+/g,'');
var i=0;
function number(){var st=i;while(i<s.length&&/[0-9.]/.test(s[i]))i++;if(st===i)throw new Error('number');var v=Number(s.slice(st,i));if(!isFinite(v))throw new Error('number');return v}
function factor(){if(s[i]==='-'){i++;return-factor()}if(s[i]==='+'){i++;return factor()}if(s[i]==='('){i++;var v=expr();if(s[i]!==')')throw new Error('paren');i++;return v}return number()}
function term(){var v=factor();while(i<s.length&&(s[i]==='*'||s[i]==='/'||s[i]==='%')){var op=s[i++],r=factor();if(op==='*')v*=r;else if(op==='/')v/=r;else v%=r}return v}
function expr(){var v=term();while(i<s.length&&(s[i]==='+'||s[i]==='-')){var op=s[i++],r=term();v=op==='+'?v+r:v-r}return v}
var out=expr();if(i!==s.length||!isFinite(out))throw new Error('bad');return out;
}
function renderCalculator(){
var keys=['C','(',')','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','%','='];
body.innerHTML='<div class="tool-panel"><div id="calcDisplay" class="tool-display calc-display">0</div><div id="calcGrid" class="calc-grid">'+keys.map(function(k){return '<button class="btn focusable" data-k="'+k+'">'+k+'</button>'}).join('')+'</div><div class="tool-status">Hỗ trợ +, −, ×, ÷, %, ngoặc và số thập phân.</div></div>';
var exp='',display=document.getElementById('calcDisplay');
document.getElementById('calcGrid').onclick=function(e){var b=e.target.closest('button');if(!b)return;var k=b.dataset.k;if(k==='C'){exp='';display.textContent='0';return}if(k==='='){try{var value=calcValue(exp);exp=String(Math.round((value+Number.EPSILON)*100000000)/100000000);display.textContent=exp}catch(err){display.textContent='Lỗi';exp=''}return}exp+=k;display.textContent=exp||'0'};
}
function renderCalendar(){
body.innerHTML='<div class="tool-panel"><div class="calendar-head"><button id="calPrev" class="btn focusable">← Tháng trước</button><div id="calTitle" class="calendar-title"></div><button id="calNext" class="btn focusable">Tháng sau →</button></div><div id="calGrid" class="calendar-grid"></div></div>';
function paint(){var y=calendarDate.getFullYear(),m=calendarDate.getMonth();document.getElementById('calTitle').textContent='Tháng '+(m+1)+' / '+y;var first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),offset=(first.getDay()+6)%7,now=new Date(),html=['T2','T3','T4','T5','T6','T7','CN'].map(function(x){return '<div class="dow">'+x+'</div>'}).join('');for(var j=0;j<offset;j++)html+='<div class="empty"></div>';for(var d=1;d<=days;d++){var today=d===now.getDate()&&m===now.getMonth()&&y===now.getFullYear();html+='<div class="'+(today?'today-cell':'')+'">'+d+'</div>'}document.getElementById('calGrid').innerHTML=html}
document.getElementById('calPrev').onclick=function(){calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1);paint()};
document.getElementById('calNext').onclick=function(){calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1);paint()};paint();
}
function renderNotes(){
var saved=localStorage.getItem('tvHubNotesV3')||'';
body.innerHTML='<div class="tool-panel"><textarea id="notesArea" class="tool-textarea focusable" placeholder="Nhập ghi chú trên TV...">'+escapeHtml(saved)+'</textarea><div class="tool-row"><button id="notesSave" class="btn primary focusable">Lưu ghi chú</button><button id="notesClear" class="btn danger focusable">Xóa</button></div><div class="tool-status">Ghi chú được lưu cục bộ trên trình duyệt TV này.</div></div>';
document.getElementById('notesSave').onclick=function(){localStorage.setItem('tvHubNotesV3',document.getElementById('notesArea').value);showToast('Đã lưu ghi chú')};
document.getElementById('notesClear').onclick=function(){document.getElementById('notesArea').value='';localStorage.removeItem('tvHubNotesV3');showToast('Đã xóa ghi chú')};
}
function rememberObjectUrl(url){mediaObjectUrls.push(url);if(mediaObjectUrls.length>6){try{URL.revokeObjectURL(mediaObjectUrls.shift())}catch(e){}}}
function renderVideo(){
body.innerHTML='<div class="tool-panel"><video id="videoPlayer" class="media-player" controls playsinline></video><div class="tool-row"><input id="videoFile" class="focusable" type="file" accept="video/*"><input id="videoUrl" class="focusable" type="url" placeholder="URL video MP4/WebM..."><button id="videoOpen" class="btn primary focusable">Mở URL</button><button id="videoToggle" class="btn focusable">Play / Pause</button></div><div class="tool-status">Có thể chọn file video từ bộ nhớ/USB nếu browser Android TV cho phép truy cập file.</div></div>';
var p=document.getElementById('videoPlayer');
document.getElementById('videoFile').onchange=function(){var f=this.files&&this.files[0];if(!f)return;var u=URL.createObjectURL(f);rememberObjectUrl(u);p.src=u;p.play().catch(function(){})};
document.getElementById('videoOpen').onclick=function(){var u=document.getElementById('videoUrl').value.trim();if(!u)return showToast('Nhập URL video');p.src=u;p.play().catch(function(){showToast('Không phát được định dạng/URL này')})};
document.getElementById('videoToggle').onclick=function(){if(p.paused)p.play().catch(function(){});else p.pause()};
}
function renderMusic(){
body.innerHTML='<div class="tool-panel"><div class="tool-display" style="font-size:54px">🎵</div><audio id="audioPlayer" class="audio-player" controls></audio><div class="tool-row"><input id="audioFile" class="focusable" type="file" accept="audio/*"><input id="audioUrl" class="focusable" type="url" placeholder="URL MP3/AAC/OGG..."><button id="audioOpen" class="btn primary focusable">Mở URL</button><button id="audioToggle" class="btn focusable">Play / Pause</button></div></div>';
var p=document.getElementById('audioPlayer');
document.getElementById('audioFile').onchange=function(){var f=this.files&&this.files[0];if(!f)return;var u=URL.createObjectURL(f);rememberObjectUrl(u);p.src=u;p.play().catch(function(){})};
document.getElementById('audioOpen').onclick=function(){var u=document.getElementById('audioUrl').value.trim();if(!u)return showToast('Nhập URL audio');p.src=u;p.play().catch(function(){showToast('Không phát được định dạng/URL này')})};
document.getElementById('audioToggle').onclick=function(){if(p.paused)p.play().catch(function(){});else p.pause()};
}
function parseM3U(text){var lines=String(text||'').split(/\r?\n/),out=[],name='';lines.forEach(function(line){line=line.trim();if(!line)return;if(line.indexOf('#EXTINF:')===0){var c=line.lastIndexOf(',');name=c>=0?line.slice(c+1).trim():'Kênh'}else if(line[0]!=='#'){out.push({name:name||('Kênh '+(out.length+1)),url:line});name=''}});return out.slice(0,300)}
function renderIPTV(){
body.innerHTML='<div class="tool-panel"><video id="iptvPlayer" class="media-player" controls playsinline></video><div class="tool-row"><input id="iptvUrl" class="focusable" type="url" placeholder="URL stream .m3u8 / MP4..."><button id="iptvPlay" class="btn primary focusable">Phát stream</button></div><textarea id="m3uText" class="tool-textarea focusable" style="min-height:150px" placeholder="Dán nội dung playlist M3U vào đây..."></textarea><div class="tool-row"><button id="m3uParse" class="btn focusable">Đọc danh sách M3U</button><input id="m3uFile" class="focusable" type="file" accept=".m3u,.m3u8,text/plain"></div><div id="channelList" class="channel-list"></div><div class="tool-status">HLS (.m3u8) cần browser/firmware TV hỗ trợ HLS native. Playlist có thể dán trực tiếp hoặc chọn file M3U.</div></div>';
var p=document.getElementById('iptvPlayer');
function play(u){if(!u)return showToast('URL stream trống');p.src=u;p.play().catch(function(){showToast('TV/browser không phát được stream này')})}
function draw(text){var channels=parseM3U(text),list=document.getElementById('channelList');list.innerHTML=channels.map(function(ch,i){return '<button class="btn channel-btn focusable" data-i="'+i+'" title="'+escapeHtml(ch.name)+'">'+escapeHtml(ch.name)+'</button>'}).join('');Array.prototype.forEach.call(list.querySelectorAll('button'),function(b){b.onclick=function(){play(channels[Number(b.dataset.i)].url)}});showToast('Đã đọc '+channels.length+' kênh')}
document.getElementById('iptvPlay').onclick=function(){play(document.getElementById('iptvUrl').value.trim())};
document.getElementById('m3uParse').onclick=function(){draw(document.getElementById('m3uText').value)};
document.getElementById('m3uFile').onchange=function(){var f=this.files&&this.files[0];if(!f)return;var r=new FileReader();r.onload=function(){document.getElementById('m3uText').value=String(r.result||'');draw(r.result)};r.readAsText(f)};
}
function metric(k,v){return '<div class="metric"><small>'+escapeHtml(k)+'</small><b>'+escapeHtml(v)+'</b></div>'}
function renderNetwork(){
var c=navigator.connection||navigator.mozConnection||navigator.webkitConnection||{};
body.innerHTML='<div class="tool-panel"><div class="network-metrics">'+metric('Internet',navigator.onLine?'Online':'Offline')+metric('Loại mạng',c.effectiveType?String(c.effectiveType).toUpperCase():'N/A')+metric('Downlink API',typeof c.downlink==='number'?c.downlink+' Mbps':'N/A')+metric('RTT API',typeof c.rtt==='number'?c.rtt+' ms':'N/A')+'</div><div id="networkResult" class="tool-status">Nhấn “Chạy test” để đo phản hồi từ chính GitHub Pages đang chạy TV Hub.</div><div class="tool-row"><button id="networkRun" class="btn primary focusable">Chạy test</button></div></div>';
document.getElementById('networkRun').onclick=async function(){var out=document.getElementById('networkResult');out.textContent='Đang đo...';var samples=[],bytes=0;try{for(var i=0;i<3;i++){var t=performance.now(),r=await fetch('./app.js?netprobe='+Date.now()+'-'+i,{cache:'no-store'}),txt=await r.text();samples.push(performance.now()-t);bytes+=txt.length}var avg=samples.reduce(function(a,b){return a+b},0)/samples.length;out.textContent='Phản hồi trung bình: '+avg.toFixed(0)+' ms · 3 lượt · Đã tải khoảng '+Math.round(bytes/1024)+' KB. Đây là phép đo tới GitHub Pages, không phải tốc độ ISP chuẩn.'}catch(e){out.textContent='Không test được: '+(navigator.onLine?'request bị chặn/lỗi mạng':'TV đang offline')}};
}
function renderScreen(){
var opts=[['Đỏ','#ff0000'],['Xanh lá','#00ff00'],['Xanh dương','#0000ff'],['Trắng','#ffffff'],['Đen','#000000'],['Xám 50%','#808080'],['Gradient','gradient'],['Checkerboard','checker']];
body.innerHTML='<div class="tool-panel"><div class="screen-options">'+opts.map(function(o){return '<button class="btn focusable screen-choice" data-pattern="'+o[1]+'">'+o[0]+'</button>'}).join('')+'</div><div class="tool-status">Sau khi mở pattern, nhấn bất kỳ phím nào trên remote hoặc click để thoát.</div></div>';
Array.prototype.forEach.call(body.querySelectorAll('.screen-choice'),function(b){b.onclick=function(){showPattern(b.dataset.pattern)}});
}
function showPattern(pattern){
if(screenOverlay)screenOverlay.remove();screenOverlay=document.createElement('div');screenOverlay.className='screen-test-overlay';
if(pattern==='gradient')screenOverlay.style.background='linear-gradient(90deg,#000 0%,#fff 50%,#000 100%)';
else if(pattern==='checker')screenOverlay.style.background='repeating-conic-gradient(#fff 0 25%,#000 0 50%) 50% / 80px 80px';
else screenOverlay.style.background=pattern;
screenOverlay.innerHTML='<div class="screen-exit-hint">Nhấn phím bất kỳ để thoát</div>';document.body.appendChild(screenOverlay);screenOverlay.onpointerdown=closePattern;
}
function closePattern(){if(screenOverlay){screenOverlay.remove();screenOverlay=null;return true}return false}
function renderSpeaker(){
body.innerHTML='<div class="tool-panel"><div class="tool-display" style="font-size:58px">🔊</div><div class="tool-row"><button id="spLeft" class="btn focusable">◀ Loa trái</button><button id="spBoth" class="btn primary focusable">Cả hai</button><button id="spRight" class="btn focusable">Loa phải ▶</button></div><div class="tool-status">Phát tone 440 Hz khoảng 0,8 giây. Giảm âm lượng TV trước nếu đang để quá lớn.</div></div>';
document.getElementById('spLeft').onclick=function(){beep(440,-1,.8)};document.getElementById('spBoth').onclick=function(){beep(440,0,.8)};document.getElementById('spRight').onclick=function(){beep(440,1,.8)};
}
function renderRemote(){
body.innerHTML='<div class="tool-panel"><div class="remote-display"><div id="remoteKey" class="remote-key">Nhấn phím</div><div id="remoteCode" class="remote-code">Remote Xiaomi: ↑ ↓ ← → OK Back Home...</div></div><div class="tool-status">Hiển thị event.key, keyCode và code mà browser nhận được. Một số phím hệ thống như Home/Power có thể bị Android giữ lại.</div></div>';
}
Array.prototype.forEach.call(document.querySelectorAll('[data-direct-tool]'),function(b){b.addEventListener('click',function(){openTool(b.dataset.directTool,b)})});
document.addEventListener('keydown',function(e){
if(screenOverlay){e.preventDefault();e.stopImmediatePropagation();closePattern();return}
if(currentTool==='remote'&&dialog.open){var k=document.getElementById('remoteKey'),c=document.getElementById('remoteCode');if(k)k.textContent=e.key||'(không có key)';if(c)c.textContent='keyCode: '+e.keyCode+' · code: '+(e.code||'N/A')+' · repeat: '+(e.repeat?'YES':'NO')}
},true);
dialog.addEventListener('close',function(){currentTool='';closePattern()});
})();