import type { ProcessStep } from '../../types/settings.types';

interface ProcessPageProps {
  steps: ProcessStep[];
  brandColor: string;
}

export function ProcessPage({ steps, brandColor }: ProcessPageProps) {
  if (steps.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: brandColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 2, flex: 1, background: '#e2e8f0', minHeight: 24 }} />
            )}
          </div>
          <div style={{ background: 'white', borderRadius: 10, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flex: 1, marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{step.name}</h3>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#64748b', margin: 0 }}>{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
