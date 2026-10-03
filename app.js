const STORAGE_KEY = 'tvUtilityTilesV1';

const defaultTiles = [
  { icon: '▶️', title: 'YouTube', url: 'https://www.youtube.com/tv' },
  { icon: '🌐', title: 'Google', url: 'https://www.google.com/' },
  { icon: '⚡', title: 'Speedtest', url: 'https://fast.com/' },
  { icon: '📺', title: 'Trang TV của tôi', url: 'https://example.com/' },
  { icon: '📰', title: 'Tin tức', url: 'https://news.google.com/' },
  { icon: '🎵', title: 'Nhạc', url: 'https://music.youtube.com/' },
  { icon: '🧭', title: 'Trang web 1', url: 'https://example.com/' },
  { icon: '⭐', title: 'Trang web 2', url: 'https://example.com/' }
];

const tilesEl = document.getElementById('tiles');
const clockEl = document.getElementById('clock');
const todayEl = document.getElementById('today');
const greetingEl = document.getElementById('greeting');
const urlInput = document.getElementById('urlInput');
const openUrlBtn = document.getElementById('openUrlBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const reloadBtn = document.getElementById('reloadBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsDialog = document.getElementById('settingsDialog');
const settingsForm = document.getElementById('settingsForm');
const settingsList = document.getElementById('settingsList');
const resetBtn = document.getElementById('resetBtn');
const toast = document.getElementById('toast');
const networkDot = document.getElementById('networkDot');
const networkText = document.getElementById('networkText');

function getTiles() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) && saved.length ? saved : defaultTiles;
  } catch {
    return defaultTiles;
  }
}

function safeUrl(raw) {
  let value = String(raw || '').trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}

function openWebsite(url) {
  const normalized = safeUrl(url);
  if (!normalized) return showToast('Địa chỉ web không hợp lệ');
  window.location.href = normalized;
}

function renderTiles() {
  tilesEl.innerHTML = '';
  getTiles().forEach((item, index) => {
    const button = document.createElement('button');
    button.className = 'tile focusable';
    button.dataset.index = index;
    button.innerHTML = `
      <span class="tile-icon" aria-hidden="true">${escapeHtml(item.icon || '🌐')}</span>
      <span class="tile-title">${escapeHtml(item.title || `Trang ${index + 1}`)}</span>
      <span class="tile-url">${escapeHtml(item.url || '')}</span>
    `;
    button.addEventListener('click', () => openWebsite(item.url));
    tilesEl.appendChild(button);
  });
}

function renderSettings() {
  settingsList.innerHTML = '';
  getTiles().forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'setting-row';
    row.innerHTML = `
      <input class="focusable icon-field" aria-label="Biểu tượng ô ${index + 1}" data-k="icon" data-i="${index}" value="${escapeAttr(item.icon || '🌐')}" />
      <input class="focusable" aria-label="Tên ô ${index + 1}" data-k="title" data-i="${index}" value="${escapeAttr(item.title || '')}" />
      <input class="focusable url-field" aria-label="Địa chỉ ô ${index + 1}" data-k="url" data-i="${index}" value="${escapeAttr(item.url || '')}" />
    `;
    settingsList.appendChild(row);
  });
}

function saveSettings() {
  const data = getTiles().map(x => ({...x}));
  settingsList.querySelectorAll('input[data-i]').forEach(input => {
    const i = Number(input.dataset.i);
    const k = input.dataset.k;
    data[i][k] = input.value.trim();
  });

  for (const item of data) {
    if (!safeUrl(item.url)) {
      showToast(`URL chưa hợp lệ: ${item.title || 'một ô'}`);
      return false;
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderTiles();
  showToast('Đã lưu cài đặt');
  return true;
}

function updateClock() {
  const now = new Date();
  clockEl.textContent = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(now);

  todayEl.textContent = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(now);

  const hour = now.getHours();
  greetingEl.textContent = hour < 11 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
}

function updateNetwork() {
  const online = navigator.onLine;
  networkDot.className = `dot ${online ? 'online' : 'offline'}`;
  networkText.textContent = online ? 'Đang kết nối Internet' : 'Mất kết nối Internet';
}

async function enterFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  } catch {
    showToast('Trình duyệt TV không cho phép toàn màn hình');
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}
function escapeAttr(value) { return escapeHtml(value); }

function getFocusable() {
  const root = settingsDialog.open ? settingsDialog : document;
  return [...root.querySelectorAll('.focusable:not([disabled])')]
    .filter(el => el.offsetParent !== null || el === document.activeElement);
}

function moveFocus(direction) {
  const items = getFocusable();
  if (!items.length) return;
  const current = document.activeElement;
  if (!items.includes(current)) {
    items[0].focus();
    return;
  }

  const c = current.getBoundingClientRect();
  const cx = c.left + c.width / 2;
  const cy = c.top + c.height / 2;

  const candidates = items
    .filter(el => el !== current)
    .map(el => {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const valid =
        direction === 'left' ? dx < -10 :
        direction === 'right' ? dx > 10 :
        direction === 'up' ? dy < -10 : dy > 10;
      if (!valid) return null;

      const main = direction === 'left' || direction === 'right' ? Math.abs(dx) : Math.abs(dy);
      const cross = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
      return { el, score: main + cross * 2.25 };
    })
    .filter(Boolean)
    .sort((a,b) => a.score - b.score);

  if (candidates[0]) {
    candidates[0].el.focus({preventScroll: false});
    candidates[0].el.scrollIntoView({block: 'nearest', inline: 'nearest'});
  }
}

openUrlBtn.addEventListener('click', () => openWebsite(urlInput.value));
urlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') openWebsite(urlInput.value);
});
fullscreenBtn.addEventListener('click', enterFullscreen);
reloadBtn.addEventListener('click', () => location.reload());
settingsBtn.addEventListener('click', () => {
  renderSettings();
  settingsDialog.showModal();
  setTimeout(() => settingsDialog.querySelector('.focusable')?.focus(), 0);
});
settingsForm.addEventListener('submit', e => {
  e.preventDefault();
  if (saveSettings()) settingsDialog.close();
});
resetBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  renderTiles();
  renderSettings();
  showToast('Đã khôi phục mặc định');
});

window.addEventListener('online', updateNetwork);
window.addEventListener('offline', updateNetwork);

document.addEventListener('keydown', e => {
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  if (map[e.key]) {
    e.preventDefault();
    moveFocus(map[e.key]);
  }

  if ((e.key === 'Escape' || e.key === 'BrowserBack') && settingsDialog.open) {
    e.preventDefault();
    settingsDialog.close();
    settingsBtn.focus();
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

renderTiles();
updateClock();
updateNetwork();
setInterval(updateClock, 1000);
setTimeout(() => document.querySelector('.tile')?.focus(), 250);
