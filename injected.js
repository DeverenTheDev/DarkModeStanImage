(function () {
  const ATTR = 'data-dark-mode-stan-image';
  const proto = CanvasRenderingContext2D.prototype;
  const originalDrawImage = proto.drawImage;

  function isBlitSource(source) {
    return (
      (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) ||
      (typeof OffscreenCanvas !== 'undefined' && source instanceof OffscreenCanvas)
    );
  }

  proto.drawImage = function (source, ...rest) {
    if (document.documentElement.hasAttribute(ATTR) && !isBlitSource(source)) {
      const prevFilter = this.filter;
      this.filter =
        (prevFilter && prevFilter !== 'none' ? prevFilter + ' ' : '') +
        'invert(1) hue-rotate(180deg)';
      const result = originalDrawImage.call(this, source, ...rest);
      this.filter = prevFilter;
      return result;
    }
    return originalDrawImage.call(this, source, ...rest);
  };
})();