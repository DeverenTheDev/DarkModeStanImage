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

  function getHost() {
    return location.hostname;
  }

  function computeEffective(data) {
    const masterEnabled = data.masterEnabled !== false; // default true
    if (!masterEnabled) return false;

    const globalDefault = !!data.globalDefault; // default false
    const siteOverrides = data.siteOverrides || {};
    const override = siteOverrides[getHost()] || 'global';

    if (override === 'on') return true;
    if (override === 'off') return false;
    return globalDefault;
  }

  function checkAndApply() {
    chrome.storage.sync.get(
      ['masterEnabled', 'globalDefault', 'siteOverrides'],
      (data) => applyDarkMode(computeEffective(data))
    );
  }

  injectCanvasPatch();
  checkAndApply();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.masterEnabled || changes.globalDefault || changes.siteOverrides) {
      checkAndApply();
    }
  });
})();