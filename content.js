(function () {
  const STYLE_ID = 'dark-mode-stan-image-style';
  const ATTR = 'data-dark-mode-stan-image';
  const BG_ATTR = 'data-dms-bg-fixed';
  const COLOR_FILTER = 'invert(1) hue-rotate(180deg)';
  const DEFAULT_ADJUST = { brightness: 100, contrast: 100 };

  let observer = null;
  let state = { enabled: false, brightness: 100, contrast: 100 };

  function buildCSS(brightness, contrast) {
    return `
      html {
        filter: ${COLOR_FILTER} brightness(${brightness}%) contrast(${contrast}%) !important;
        background: #fff !important;
      }
      img, video, picture, svg image, embed, object,
      [style*="background-image"] {
        filter: ${COLOR_FILTER} !important;
      }
    `;
  }

  function fixBackgroundImages(root) {
    if (!(root instanceof Element)) return;
    const candidates = root.querySelectorAll('*');
    for (const el of candidates) {
      if (el.hasAttribute(BG_ATTR)) continue;
      if (el.closest(`[${BG_ATTR}]`)) continue;
      if (el.querySelector('img')) continue;
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none' && bg.includes('url(')) {
        el.style.setProperty('filter', COLOR_FILTER, 'important');
        el.setAttribute(BG_ATTR, 'true');
      }
    }
  }

  function clearBackgroundFixes() {
    document.querySelectorAll(`[${BG_ATTR}]`).forEach((el) => {
      el.style.removeProperty('filter');
      el.removeAttribute(BG_ATTR);
    });
  }

  function startObserving() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === 1) fixBackgroundImages(node);
        });
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function stopObserving() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function injectCanvasPatch() {
    if (document.getElementById('dark-mode-stan-image-injected')) return;
    const script = document.createElement('script');
    script.id = 'dark-mode-stan-image-injected';
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }

  function render() {
    let style = document.getElementById(STYLE_ID);
    if (state.enabled) {
      if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        (document.head || document.documentElement).appendChild(style);
      }
      style.textContent = buildCSS(state.brightness, state.contrast);
      document.documentElement.setAttribute(ATTR, 'true');
      fixBackgroundImages(document.documentElement);
      startObserving();
    } else {
      if (style) style.remove();
      document.documentElement.removeAttribute(ATTR);
      stopObserving();
      clearBackgroundFixes();
    }
  }

  function getHost() {
    return location.hostname;
  }

  function computeState(data) {
    const masterEnabled = data.masterEnabled !== false;
    const globalDefault = !!data.globalDefault;
    const siteOverrides = data.siteOverrides || {};
    const override = siteOverrides[getHost()] || 'global';

    let enabled;
    if (!masterEnabled) enabled = false;
    else if (override === 'on') enabled = true;
    else if (override === 'off') enabled = false;
    else enabled = globalDefault;

    const siteAdjust = (data.siteAdjust || {})[getHost()] || DEFAULT_ADJUST;

    return {
      enabled,
      brightness: siteAdjust.brightness,
      contrast: siteAdjust.contrast
    };
  }

  function checkAndApply() {
    chrome.storage.sync.get(
      ['masterEnabled', 'globalDefault', 'siteOverrides', 'siteAdjust'],
      (data) => {
        state = computeState(data);
        render();
      }
    );
  }

  injectCanvasPatch();
  checkAndApply();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (
      changes.masterEnabled ||
      changes.globalDefault ||
      changes.siteOverrides ||
      changes.siteAdjust
    ) {
      checkAndApply();
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === 'DMS_PREVIEW_ADJUST') {
      state = {
        ...state,
        brightness: message.brightness,
        contrast: message.contrast
      };
      render();
    }
  });
})();