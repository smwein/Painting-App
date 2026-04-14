import type { GalleryItem } from '../../types/settings.types';

interface GalleryPageProps {
  items: GalleryItem[];
}

export function GalleryPage({ items }: GalleryPageProps) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: 'white', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {(item.beforeUrl || item.afterUrl) && (
            <div className="quote-gallery-images" style={{ display: 'grid', gridTemplateColumns: item.beforeUrl && item.afterUrl ? '1fr 1fr' : '1fr' }}>
              {item.beforeUrl && (
                <div style={{ position: 'relative' }}>
                  <img src={item.beforeUrl} alt="Before" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>Before</div>
                </div>
              )}
              {item.afterUrl && (
                <div style={{ position: 'relative' }}>
                  <img src={item.afterUrl} alt="After" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>After</div>
                </div>
              )}
            </div>
          )}
          <div style={{ padding: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{item.projectName}</h3>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#64748b' }}>{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
