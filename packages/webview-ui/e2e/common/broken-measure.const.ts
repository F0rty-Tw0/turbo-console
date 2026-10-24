/** Init script: every canvas text measurement throws, as a page whose label sizing broke, until `MEASURE_FIXED` runs. */
export const BROKEN_MEASURE = `{
  const measureText = CanvasRenderingContext2D.prototype.measureText;

  window.__tcMeasureBroken = true;
  CanvasRenderingContext2D.prototype.measureText = function (text) {
    if (window.__tcMeasureBroken) throw new Error('measureText is broken');

    return measureText.call(this, text);
  };
}`;

/** Page script: canvas text measurement works again after `BROKEN_MEASURE`. */
export const MEASURE_FIXED = 'window.__tcMeasureBroken = false;';
