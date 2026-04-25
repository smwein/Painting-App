export type DiscountType = 'percent' | 'fixed';

export interface DiscountConfig {
  type: DiscountType;
  value: number;
}

export interface DiscountResult {
  discountAmount: number;
  finalTotal: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function applyDiscount(subtotal: number, config: DiscountConfig | null): DiscountResult {
  if (!config) return { discountAmount: 0, finalTotal: subtotal };

  let raw = config.type === 'percent'
    ? subtotal * (config.value / 100)
    : config.value;

  const discountAmount = round2(Math.min(raw, subtotal));
  const finalTotal = round2(subtotal - discountAmount);
  return { discountAmount, finalTotal };
}

export function isDiscountActive(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

export function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return '0m 0s';

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}
