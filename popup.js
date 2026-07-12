let currentHost = null;

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

function loadAndRender() {
  chrome.storage.sync.get(
    ['masterEnabled', 'globalDefault', 'siteOverrides'],
    (data) => {
      const masterEnabled = data.masterEnabled !== false;
      const globalDefault = !!data.globalDefault;
      const siteOverrides = data.siteOverrides || {};
      const mode = siteOverrides[currentHost] || 'global';

      renderMaster(masterEnabled);
      renderGlobal(globalDefault);
      renderSiteMode(mode);
    }
  );
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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