(function () {
  const ATTR = 'data-dark-mode-stan-image';
  const proto = CanvasRenderingContext2D.prototype;
  const originalDrawImage = proto.drawImage;

  proto.drawImage = function (...args) {
    if (document.documentElement.hasAttribute(ATTR)) {
      const prevFilter = this.filter;
      this.filter =
        (prevFilter && prevFilter !== 'none' ? prevFilter + ' ' : '') +
        'invert(1) hue-rotate(180deg)';
      const result = originalDrawImage.apply(this, args);
      this.filter = prevFilter;
      return result;
    }
    return originalDrawImage.apply(this, args);
  };
})();