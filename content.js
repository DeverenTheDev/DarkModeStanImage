(function () {
  const STYLE_ID = 'dark-mode-stan-image-style';
  const ATTR = 'data-dark-mode-stan-image';
  const BG_ATTR = 'data-dms-bg-fixed';
  const FILTER_VALUE = 'invert(1) hue-rotate(180deg)';

  let observer = null;

  function buildCSS() {
    return `
      html {
        filter: ${FILTER_VALUE} !important;
        background: #fff !important;
      }
      img, video, picture, svg image, embed, object,
      [style*="background-image"] {
        filter: ${FILTER_VALUE} !important;
      }
    `;
  }

  // Catches background images set via external/class-based CSS, which the
  // [style*="background-image"] selector can't see (it only sees inline
  // style attributes). We check the resolved computed style instead, and
  // apply the un-invert directly as an inline style, which wins regardless
  // of where the original background-image rule came from.
  function fixBackgroundImages(root) {
    if (!(root instanceof Element)) return;
    const candidates = root.querySelectorAll('*');
    for (const el of candidates) {
      if (el.hasAttribute(BG_ATTR)) continue;
      // Skip anything already inside an element we fixed -- nested filters
      // compound, so fixing both an ancestor and descendant double-corrects.
      if (el.closest(`[${BG_ATTR}]`)) continue;
      // Skip containers that hold a real <img> -- the img's own filter
      // (from the stylesheet rule) already handles it. If we ALSO put a
      // filter on a wrapper div around it (e.g. a blurred placeholder or
      // status-ring background sitting behind the photo), that wrapper's
      // filter compounds with the img's filter and nets out to an odd
      // number of inversions -- i.e. it stays inverted. This was the
      // LinkedIn avatar bug.
      if (el.querySelector('img')) continue;
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none' && bg.includes('url(')) {
        el.style.setProperty('filter', FILTER_VALUE, 'important');
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

  // LinkedIn (and most modern sites) keep injecting new DOM after the
  // initial page load -- popups, infinite scroll, SPA navigation. A
  // one-time scan on load would miss all of that, so we watch for new
  // elements and check each one as it appears.
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