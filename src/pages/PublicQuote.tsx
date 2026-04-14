import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import type { PublicQuote } from '../types/quote.types';
import type { Bid } from '../types/bid.types';
import type { PresentationSettings } from '../types/settings.types';
import { notifyQuoteEvent } from '../services/quoteService';
import { AboutUsPage } from '../components/quote-pages/AboutUsPage';
import { ServicesPage } from '../components/quote-pages/ServicesPage';
import { TestimonialsPage } from '../components/quote-pages/TestimonialsPage';
import { GalleryPage } from '../components/quote-pages/GalleryPage';
import { ProcessPage } from '../components/quote-pages/ProcessPage';
import { TermsPage } from '../components/quote-pages/TermsPage';

interface QuoteData {
  quote: PublicQuote;
  bid: Bid;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo?: string;
  brandColor: string;
  presentation?: PresentationSettings;
}

function mapQuoteRow(row: any): PublicQuote {
  return {
    id: row.id,
    organizationId: row.organization_id,
    bidId: row.bid_id,
    publicToken: row.public_token,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    status: row.status,
    enabledPages: row.enabled_pages,
    acceptedAt: row.accepted_at,
    signatureText: row.signature_text,
    viewedAt: row.viewed_at,
    viewCount: row.view_count,
    expiresAt: row.expires_at,
    sentBy: row.sent_by,
    createdAt: row.created_at,
  };
}

export function PublicQuote() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('estimate');
  const [tabDropdownOpen, setTabDropdownOpen] = useState(false);

  const loadQuote = useCallback(async () => {
    if (!token) return;
    try {
      const { data: quoteRow, error: qErr } = await supabase
        .from('public_quotes')
        .select('*')
        .eq('public_token', token)
        .single();

      if (qErr || !quoteRow) {
        setError('Quote not found');
        return;
      }

      const quote = mapQuoteRow(quoteRow);

      if (new Date(quote.expiresAt) < new Date()) {
        setError('expired');
        const { data: settingsRow } = await supabase
          .from('pricing_settings')
          .select('settings_json')
          .eq('organization_id', quote.organizationId)
          .single();
        const settings = settingsRow?.settings_json as Record<string, any> | undefined;
        setData({
          quote,
          bid: {} as Bid,
          companyName: settings?.name ?? '',
          companyPhone: settings?.phone ?? '',
          companyEmail: settings?.email ?? '',
          companyLogo: settings?.logo,
          brandColor: settings?.presentation?.brandColor ?? '#2563eb',
          presentation: settings?.presentation,
        });
        return;
      }

      const { data: bidRow, error: bErr } = await supabase
        .from('bids')
        .select('*')
        .eq('id', quote.bidId)
        .single();

      if (bErr || !bidRow) {
        setError('Bid data not found');
        return;
      }

      const bid: Bid = {
        id: bidRow.id,
        ...(bidRow.bid_data as any),
        createdAt: new Date(bidRow.created_at),
        updatedAt: new Date(bidRow.updated_at),
      };

      const { data: settingsRow } = await supabase
        .from('pricing_settings')
        .select('settings_json')
        .eq('organization_id', quote.organizationId)
        .single();

      const settings = settingsRow?.settings_json as Record<string, any> | undefined;

      setData({
        quote,
        bid,
        companyName: settings?.name ?? 'Painting Company',
        companyPhone: settings?.phone ?? '',
        companyEmail: settings?.email ?? '',
        companyLogo: settings?.logo,
        brandColor: settings?.presentation?.brandColor ?? '#2563eb',
        presentation: settings?.presentation,
      });

      if (quote.status === 'accepted') {
        setAccepted(true);
      }

      notifyQuoteEvent({ token, event: 'viewed' }).catch(() => {});
    } catch {
      setError('Failed to load quote');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadQuote(); }, [loadQuote]);

  const handleAccept = async () => {
    if (!signatureName.trim() || !token) return;
    setAccepting(true);
    try {
      await notifyQuoteEvent({ token, event: 'accepted', signatureText: signatureName.trim() });
      setAccepted(true);
      setShowAcceptModal(false);
    } catch {
      alert('Failed to accept. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error === 'expired' && data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 40, maxWidth: 480, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>Estimate Expired</h2>
          <p style={{ color: '#64748b', fontSize: 15, margin: '0 0 24px' }}>
            This estimate expired on {new Date(data.quote.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. Please contact {data.companyName} for an updated quote.
          </p>
          {data.companyPhone && <p style={{ color: '#475569', fontSize: 14, margin: '4px 0' }}>{data.companyPhone}</p>}
          {data.companyEmail && <p style={{ color: '#475569', fontSize: 14, margin: '4px 0' }}>{data.companyEmail}</p>}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 40, maxWidth: 480, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Quote Not Found</h2>
          <p style={{ color: '#64748b', fontSize: 15 }}>This link may be invalid or the quote may have been removed.</p>
        </div>
      </div>
    );
  }

  const { quote, bid, companyName, companyPhone, companyEmail, companyLogo, brandColor } = data;

  const TAB_LABELS: Record<string, string> = {
    estimate: 'Estimate',
    about: 'About Us',
    services: 'Services',
    testimonials: 'Testimonials',
    gallery: 'Gallery',
    process: 'Our Process',
    terms: 'Terms',
  };

  const tabs = ['estimate', ...quote.enabledPages.filter((p) => p !== 'estimate')];

  const lineItems: Array<{ name: string }> = [];
  if (bid.result.materials.items.length > 0) {
    bid.result.materials.items.forEach((item) => {
      lineItems.push({ name: item.name });
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <header style={{ background: 'white', borderBottom: `2px solid ${brandColor}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {companyLogo && (
            <img src={companyLogo} alt={companyName} style={{ height: 40, borderRadius: 8 }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{companyName}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {[companyPhone, companyEmail].filter(Boolean).join(' \u2022 ')}
            </div>
          </div>
        </div>
        {tabs.length > 1 ? (
          <>
            {/* Desktop: horizontal tabs */}
            <div className="quote-tabs-desktop" style={{ display: 'flex', gap: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: activeTab === tab ? 600 : 400,
                    color: activeTab === tab ? brandColor : '#64748b',
                    background: 'none',
                    border: 'none',
                    borderBottom: `2px solid ${activeTab === tab ? brandColor : 'transparent'}`,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {TAB_LABELS[tab] || tab}
                </button>
              ))}
            </div>
            {/* Mobile: dropdown */}
            <div className="quote-tabs-mobile" style={{ position: 'relative', display: 'none' }}>
              <button
                onClick={() => setTabDropdownOpen(!tabDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: brandColor,
                  background: 'none',
                  border: `1px solid ${brandColor}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                {TAB_LABELS[activeTab] || activeTab}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: tabDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {tabDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  background: 'white',
                  borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  border: '1px solid #e2e8f0',
                  zIndex: 40,
                  minWidth: 160,
                  overflow: 'hidden',
                }}>
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setTabDropdownOpen(false); }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 16px',
                        fontSize: 13,
                        fontWeight: activeTab === tab ? 600 : 400,
                        color: activeTab === tab ? brandColor : '#475569',
                        background: activeTab === tab ? '#f8fafc' : 'white',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      {TAB_LABELS[tab] || tab}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 500, color: brandColor, borderBottom: `2px solid ${brandColor}`, paddingBottom: 2 }}>
            Estimate
          </div>
        )}
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        {activeTab === 'estimate' && (
          <>
            <div style={{ background: 'white', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Estimate for</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{quote.customerName}</div>
              {bid.customer?.address && (
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{bid.customer.address}</div>
              )}
              {bid.customer?.jobDate && (
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                  Job Date: {new Date(bid.customer.jobDate).toLocaleDateString()}
                </div>
              )}
            </div>

            <div style={{ background: 'white', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Scope of Work</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginBottom: 8 }}>Professional painting services</div>
              {lineItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < lineItems.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: 13 }}>
                  <span style={{ color: '#475569' }}>{'\u2022'} {item.name}</span>
                </div>
              ))}
              {bid.result.materials.items.length === 0 && (
                <div style={{ fontSize: 13, color: '#475569' }}>{'\u2022'} All materials and supplies included</div>
              )}
            </div>

            <div style={{ background: brandColor, borderRadius: 10, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Project Total</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'white' }}>${bid.result.total.toFixed(2)}</div>
              </div>
              {accepted ? (
                <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '12px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14 }}>
                  {'\u2713'} Accepted
                </div>
              ) : (
                <button
                  onClick={() => setShowAcceptModal(true)}
                  style={{ background: 'white', color: brandColor, padding: '12px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
                >
                  Accept Estimate
                </button>
              )}
            </div>

            {accepted && (quote.signatureText || signatureName) && (
              <div style={{ background: 'white', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Accepted by</div>
                <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 32, color: '#1e293b' }}>
                  {quote.signatureText || signatureName}
                </div>
                {quote.acceptedAt && (
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    {new Date(quote.acceptedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'about' && data.presentation?.aboutUs && (
          <AboutUsPage aboutUs={data.presentation.aboutUs} brandColor={brandColor} />
        )}

        {activeTab === 'services' && data.presentation?.services && (
          <ServicesPage items={data.presentation.services.items} />
        )}

        {activeTab === 'testimonials' && data.presentation?.testimonials && (
          <TestimonialsPage items={data.presentation.testimonials.items} brandColor={brandColor} />
        )}

        {activeTab === 'gallery' && data.presentation?.gallery && (
          <GalleryPage items={data.presentation.gallery.items} />
        )}

        {activeTab === 'process' && data.presentation?.process && (
          <ProcessPage steps={data.presentation.process.steps} brandColor={brandColor} />
        )}

        {activeTab === 'terms' && data.presentation?.terms && (
          <TermsPage content={data.presentation.terms.content} />
        )}

        <div style={{ textAlign: 'center', padding: '32px 0 16px', fontSize: 12, color: '#94a3b8' }}>
          Powered by CoatCalc
        </div>
      </main>

      {showAcceptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 32, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>Accept This Estimate</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px' }}>Type your full name below to sign and accept this estimate.</p>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 4 }}>Full Name</label>
            <input
              type="text"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="John Smith"
              autoFocus
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
            />

            {signatureName.trim() && (
              <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Signature Preview</div>
                <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 36, color: '#1e293b' }}>
                  {signatureName}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => setShowAcceptModal(false)}
                style={{ flex: 1, padding: '10px 16px', border: '1px solid #d1d5db', borderRadius: 8, background: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={!signatureName.trim() || accepting}
                style={{ flex: 1, padding: '10px 16px', border: 'none', borderRadius: 8, background: signatureName.trim() ? brandColor : '#94a3b8', color: 'white', fontSize: 14, fontWeight: 700, cursor: signatureName.trim() ? 'pointer' : 'not-allowed' }}
              >
                {accepting ? 'Accepting...' : 'Confirm & Accept'}
              </button>
            </div>
          </div>
        </div>
      )}

      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @media (max-width: 479px) {
          .quote-tabs-desktop { display: none !important; }
          .quote-tabs-mobile { display: block !important; }
          .quote-services-grid { grid-template-columns: 1fr !important; }
          .quote-gallery-images img { max-height: 120px !important; }
        }
      `}</style>
    </div>
  );
}
