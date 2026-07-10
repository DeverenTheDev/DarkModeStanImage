(function () {
  const STYLE_ID = 'dark-mode-stan-image-style';
  const ATTR = 'data-dark-mode-stan-image';

  function buildCSS() {
    return `
      html {
        filter: invert(1) hue-rotate(180deg) !important;
        background: #fff !important;
      }
      img, video, picture, svg image, embed, object,
      [style*="background-image"] {
        filter: invert(1) hue-rotate(180deg) !important;
      }
    `;
  }

  function injectCanvasPatch() {
    if (document.getElementById('dark-mode-stan-image-injected')) return;
    const script = document.createElement('script');
    script.id = 'dark-mode-stan-image-injected';
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }

  function applyDarkMode(enabled) {
    let style = document.getElementById(STYLE_ID);
    if (enabled) {
      if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = buildCSS();
        (document.head || document.documentElement).appendChild(style);
      }
      document.documentElement.setAttribute(ATTR, 'true');
    } else {
      if (style) style.remove();
      document.documentElement.removeAttribute(ATTR);
    }
  }

  function checkAndApply() {
    chrome.storage.sync.get(['darkModeEnabled'], (data) => {
      applyDarkMode(!!data.darkModeEnabled);
    });
  }

  injectCanvasPatch();
  checkAndApply();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.darkModeEnabled) {
      applyDarkMode(!!changes.darkModeEnabled.newValue);
    }
  });
})();