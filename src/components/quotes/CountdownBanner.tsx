import { useEffect, useState } from 'react';
import { formatCountdown, isDiscountActive } from '../../utils/discount';

interface CountdownBannerProps {
  discountExpiresAt: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  onExpire?: () => void;
}

export function CountdownBanner({ discountExpiresAt, discountType, discountValue, onExpire }: CountdownBannerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const expiry = new Date(discountExpiresAt).getTime();
  const remainingMs = Math.max(0, expiry - now);
  const active = isDiscountActive(discountExpiresAt) && remainingMs > 0;

  useEffect(() => {
    if (!active && onExpire) onExpire();
  }, [active, onExpire]);

  if (active) {
    const label = discountType === 'percent' ? `${discountValue}% off` : `$${discountValue} off`;
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          width: '100%',
          background: '#0ea5a0',
          color: 'white',
          padding: '14px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15 }}>🕐 Limited-time offer: {label}</span>
        <span style={{ fontSize: 14, opacity: 0.95 }}>Expires in {formatCountdown(remainingMs)}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      style={{
        width: '100%',
        background: '#94a3b8',
        color: 'white',
        padding: '14px 20px',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 15 }}>⏱ This offer has expired</span>
      <span style={{ fontSize: 14, opacity: 0.95, marginLeft: 8 }}>
        The original price is still valid — contact us to discuss
      </span>
    </div>
  );
}
