(function () {
  const STYLE_ID = 'dark-mode-stan-image-style';

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

  function applyDarkMode(enabled) {
    let style = document.getElementById(STYLE_ID);
    if (enabled) {
      if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = buildCSS();
        (document.head || document.documentElement).appendChild(style);
      }
    } else if (style) {
      style.remove();
    }
  }

  function checkAndApply() {
    chrome.storage.sync.get(['darkModeEnabled'], (data) => {
      applyDarkMode(!!data.darkModeEnabled);
    });
  }

  checkAndApply();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.darkModeEnabled) {
      applyDarkMode(!!changes.darkModeEnabled.newValue);
    }
  });
})();