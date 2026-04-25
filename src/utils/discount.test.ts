import { describe, it, expect } from 'vitest';
import { applyDiscount, formatCountdown, isDiscountActive } from './discount';

describe('applyDiscount', () => {
  it('applies a percentage discount', () => {
    expect(applyDiscount(10000, { type: 'percent', value: 10 })).toEqual({
      discountAmount: 1000,
      finalTotal: 9000,
    });
  });

  it('applies a fixed-dollar discount', () => {
    expect(applyDiscount(10000, { type: 'fixed', value: 500 })).toEqual({
      discountAmount: 500,
      finalTotal: 9500,
    });
  });

  it('rounds percentage discount to cents', () => {
    expect(applyDiscount(99.99, { type: 'percent', value: 10 })).toEqual({
      discountAmount: 10.00,
      finalTotal: 89.99,
    });
  });

  it('caps fixed discount at the subtotal (never negative total)', () => {
    expect(applyDiscount(100, { type: 'fixed', value: 500 })).toEqual({
      discountAmount: 100,
      finalTotal: 0,
    });
  });

  it('returns zero discount for null discount config', () => {
    expect(applyDiscount(10000, null)).toEqual({
      discountAmount: 0,
      finalTotal: 10000,
    });
  });
});

describe('isDiscountActive', () => {
  it('returns true when expiry is in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isDiscountActive(future)).toBe(true);
  });

  it('returns false when expiry is in the past', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isDiscountActive(past)).toBe(false);
  });

  it('returns false when expiry is null', () => {
    expect(isDiscountActive(null)).toBe(false);
  });
});

describe('formatCountdown', () => {
  it('returns 0m 0s when remaining ms is zero or negative', () => {
    expect(formatCountdown(0)).toBe('0m 0s');
    expect(formatCountdown(-1000)).toBe('0m 0s');
  });

  it('formats seconds-only when less than a minute', () => {
    expect(formatCountdown(45_000)).toBe('0m 45s');
  });

  it('formats minutes and seconds when less than an hour', () => {
    expect(formatCountdown(32 * 60_000 + 18_000)).toBe('32m 18s');
  });

  it('formats hours, minutes, and seconds when less than a day', () => {
    expect(formatCountdown(4 * 3_600_000 + 32 * 60_000 + 18_000)).toBe('4h 32m 18s');
  });

  it('formats days, hours, and minutes when more than a day', () => {
    expect(formatCountdown(2 * 86_400_000 + 14 * 3_600_000 + 32 * 60_000)).toBe('2d 14h 32m');
  });
});
