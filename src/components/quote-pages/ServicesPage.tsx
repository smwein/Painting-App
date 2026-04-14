import type { ServiceItem } from '../../types/settings.types';

interface ServicesPageProps {
  items: ServiceItem[];
}

export function ServicesPage({ items }: ServicesPageProps) {
  if (items.length === 0) return null;
  return (
    <div className="quote-services-grid" style={{ display: 'grid', gridTemplateColumns: items.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: 'white', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {item.imageUrl && (
            <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
          )}
          <div style={{ padding: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{item.name}</h3>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#64748b' }}>{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
