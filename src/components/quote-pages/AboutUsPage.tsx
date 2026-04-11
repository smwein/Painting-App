import type { AboutUsSettings } from '../../types/settings.types';

interface AboutUsPageProps {
  aboutUs: AboutUsSettings;
  brandColor: string;
}

export function AboutUsPage({ aboutUs, brandColor }: AboutUsPageProps) {
  return (
    <div>
      <div style={{ background: 'white', borderRadius: 10, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>{aboutUs.heading}</h2>
        {aboutUs.imageUrl && (
          <img src={aboutUs.imageUrl} alt="Company" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }} />
        )}
        {aboutUs.bodyText && (
          <div style={{ fontSize: 14, lineHeight: 1.7, color: '#475569', whiteSpace: 'pre-wrap' }}>
            {aboutUs.bodyText}
          </div>
        )}
      </div>

      {aboutUs.stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(aboutUs.stats.length, 3)}, 1fr)`, gap: 12, marginBottom: 16 }}>
          {aboutUs.stats.map((stat, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 10, padding: 16, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: brandColor }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
