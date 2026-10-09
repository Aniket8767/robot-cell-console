// Pure functions for the pick maths (see DESIGN.md). No Vue, no DOM: easy to test.

/**
 * Converts a mouse click on the DISPLAYED <img> to pixel coordinates of the SOURCE image.
 * rect = img.getBoundingClientRect(); naturalWidth/Height = size of the real image.
 */
export function clickToSourcePixel({ clientX, clientY, rect, naturalWidth, naturalHeight }) {
  return {
    u: ((clientX - rect.left) / rect.width) * naturalWidth,
    v: ((clientY - rect.top) / rect.height) * naturalHeight,
    srcWidth: naturalWidth,
    srcHeight: naturalHeight,
    displayWidth: rect.width,
    displayHeight: rect.height,
  };
}

/** Offset from the image centre, in source pixels (du, dv) and millimetres (dx, dy). +x right, +y down. */
export function pixelToOffsetMm({ u, v, srcWidth, srcHeight, mmPerPixel }) {
  const du = u - srcWidth / 2;
  const dv = v - srcHeight / 2;
  return { du, dv, dx: du * mmPerPixel, dy: dv * mmPerPixel };
}

/** Extra +X offset (mm) the belt travels during the pipeline latency. (m/s) x (ms) = mm. */
export function compensationMm(beltSpeedMPerS, latencyMs) {
  return beltSpeedMPerS * latencyMs;
}
