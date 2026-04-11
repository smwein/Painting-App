import type { TestimonialItem } from '../../types/settings.types';

interface TestimonialsPageProps {
  items: TestimonialItem[];
  brandColor: string;
}

export function TestimonialsPage({ items, brandColor }: TestimonialsPageProps) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: 'white', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {item.photoUrl && (
              <img src={item.photoUrl} alt={item.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, color: brandColor, marginBottom: 4 }}>
                {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#475569', fontStyle: 'italic', margin: '0 0 8px' }}>
                "{item.quote}"
              </p>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.name}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
