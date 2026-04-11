interface TermsPageProps {
  content: string;
}

export function TermsPage({ content }: TermsPageProps) {
  if (!content) return null;
  return (
    <div style={{ background: 'white', borderRadius: 10, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Terms & Conditions</h2>
      <div style={{ fontSize: 13, lineHeight: 1.8, color: '#475569', whiteSpace: 'pre-wrap' }}>
        {content}
      </div>
    </div>
  );
}
