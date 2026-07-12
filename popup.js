let currentHost = null;
let currentTabId = null;

function renderMaster(enabled) {
  const btn = document.getElementById('masterToggle');
  btn.className = enabled ? 'on' : '';
}

function renderGlobal(enabled) {
  document.getElementById('globalToggle').checked = enabled;
}

function renderSiteMode(mode) {
  document.querySelectorAll('input[name="siteMode"]').forEach((r) => {
    r.checked = r.value === mode;
  });
}

function renderAdjust(brightness, contrast) {
  document.getElementById('brightness').value = brightness;
  document.getElementById('contrast').value = contrast;
  document.getElementById('brightnessValue').textContent = brightness + '%';
  document.getElementById('contrastValue').textContent = contrast + '%';
}

function loadAndRender() {
  chrome.storage.sync.get(
    ['masterEnabled', 'globalDefault', 'siteOverrides', 'siteAdjust'],
    (data) => {
      const masterEnabled = data.masterEnabled !== false;
      const globalDefault = !!data.globalDefault;
      const siteOverrides = data.siteOverrides || {};
      const mode = siteOverrides[currentHost] || 'global';
      const adjust = (data.siteAdjust || {})[currentHost] || {
        brightness: 100,
        contrast: 100
      };

      renderMaster(masterEnabled);
      renderGlobal(globalDefault);
      renderSiteMode(mode);
      renderAdjust(adjust.brightness, adjust.contrast);
    }
  );
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  currentTabId = tabs[0].id;
  try {
    currentHost = new URL(tabs[0].url).hostname;
  } catch (e) {
    currentHost = null;
  }
  document.getElementById('siteName').textContent = currentHost || 'this page';
  loadAndRender();
});

document.getElementById('masterToggle').addEventListener('click', () => {
  chrome.storage.sync.get(['masterEnabled'], (data) => {
    const newValue = !(data.masterEnabled !== false);
    chrome.storage.sync.set({ masterEnabled: newValue }, loadAndRender);
  });
});

document.getElementById('globalToggle').addEventListener('change', (e) => {
  chrome.storage.sync.set({ globalDefault: e.target.checked }, loadAndRender);
});

document.querySelectorAll('input[name="siteMode"]').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    if (!currentHost) return;
    chrome.storage.sync.get(['siteOverrides'], (data) => {
      const siteOverrides = data.siteOverrides || {};
      if (e.target.value === 'global') {
        delete siteOverrides[currentHost];
      } else {
        siteOverrides[currentHost] = e.target.value;
      }
      chrome.storage.sync.set({ siteOverrides }, loadAndRender);
    });
  });
});

document.getElementById('panelHeader').addEventListener('click', () => {
  document.getElementById('panel').classList.toggle('collapsed');
});

// --- Brightness / contrast sliders ---

const brightnessInput = document.getElementById('brightness');
const contrastInput = document.getElementById('contrast');

function sendPreview(brightness, contrast) {
  if (currentTabId == null) return;
  chrome.tabs.sendMessage(currentTabId, {
    type: 'DMS_PREVIEW_ADJUST',
    brightness,
    contrast
  });
}

function commitAdjust(brightness, contrast) {
  if (!currentHost) return;
  chrome.storage.sync.get(['siteAdjust'], (data) => {
    const siteAdjust = data.siteAdjust || {};
    siteAdjust[currentHost] = { brightness, contrast };
    chrome.storage.sync.set({ siteAdjust });
  });
}

function handleSliderInput() {
  const brightness = Number(brightnessInput.value);
  const contrast = Number(contrastInput.value);
  document.getElementById('brightnessValue').textContent = brightness + '%';
  document.getElementById('contrastValue').textContent = contrast + '%';
  sendPreview(brightness, contrast);
}

function handleSliderCommit() {
  const brightness = Number(brightnessInput.value);
  const contrast = Number(contrastInput.value);
  commitAdjust(brightness, contrast);
}

brightnessInput.addEventListener('input', handleSliderInput);
brightnessInput.addEventListener('change', handleSliderCommit);
contrastInput.addEventListener('input', handleSliderInput);
contrastInput.addEventListener('change', handleSliderCommit);

document.getElementById('resetAdjust').addEventListener('click', () => {
  if (!currentHost) return;
  chrome.storage.sync.get(['siteAdjust'], (data) => {
    const siteAdjust = data.siteAdjust || {};
    delete siteAdjust[currentHost];
    chrome.storage.sync.set({ siteAdjust }, () => {
      renderAdjust(100, 100);
      sendPreview(100, 100);
    });
  });
});