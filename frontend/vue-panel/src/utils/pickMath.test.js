import { describe, expect, it } from 'vitest';
import { clickToSourcePixel, compensationMm, pixelToOffsetMm } from './pickMath';

const rect = (left, top, width, height) => ({ left, top, width, height });

describe('clickToSourcePixel (display vs source scaling)', () => {
  it('maps a 640 px wide display of a 1280 px source back to source pixels', () => {
    const p = clickToSourcePixel({ clientX: 320, clientY: 180, rect: rect(0, 0, 640, 360), naturalWidth: 1280, naturalHeight: 720 });
    expect(p.u).toBe(640);
    expect(p.v).toBe(360);
  });

  it('accounts for the image position on the page', () => {
    const p = clickToSourcePixel({ clientX: 420, clientY: 280, rect: rect(100, 100, 640, 360), naturalWidth: 1280, naturalHeight: 720 });
    expect(p.u).toBe(640);
    expect(p.v).toBe(360);
  });

  it('maps the bottom-right display corner to the bottom-right source pixel', () => {
    const p = clickToSourcePixel({ clientX: 640, clientY: 360, rect: rect(0, 0, 640, 360), naturalWidth: 1280, naturalHeight: 720 });
    expect([p.u, p.v]).toEqual([1280, 720]);
  });

  it('is the identity when display size equals source size', () => {
    const p = clickToSourcePixel({ clientX: 10, clientY: 20, rect: rect(0, 0, 1280, 720), naturalWidth: 1280, naturalHeight: 720 });
    expect([p.u, p.v]).toEqual([10, 20]);
  });
});

describe('pixelToOffsetMm', () => {
  it('is zero at the image centre', () => {
    const o = pixelToOffsetMm({ u: 640, v: 360, srcWidth: 1280, srcHeight: 720, mmPerPixel: 0.4 });
    expect([o.dx, o.dy]).toEqual([0, 0]);
  });

  it('uses 0.4 mm/pixel: 200 px right of centre is 80 mm', () => {
    const o = pixelToOffsetMm({ u: 840, v: 360, srcWidth: 1280, srcHeight: 720, mmPerPixel: 0.4 });
    expect(o.du).toBe(200);
    expect(o.dx).toBeCloseTo(80, 6);
  });

  it('y grows downward (image convention)', () => {
    const o = pixelToOffsetMm({ u: 640, v: 160, srcWidth: 1280, srcHeight: 720, mmPerPixel: 0.4 });
    expect(o.dy).toBeCloseTo(-80, 6);
  });
});

describe('compensationMm', () => {
  it('defaults: 0.25 m/s x 200 ms = 50 mm', () => {
    expect(compensationMm(0.25, 200)).toBeCloseTo(50, 9);
  });

  it('is zero for a stopped belt', () => {
    expect(compensationMm(0, 200)).toBe(0);
  });

  it('scales linearly with latency', () => {
    expect(compensationMm(0.25, 400)).toBeCloseTo(100, 9);
  });
});
