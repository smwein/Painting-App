import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';

/* ── Data ── */
const features = [
  {
    label: '5 Calculators',
    desc: 'Interior & exterior, square footage & detailed, plus per-room. The right tool for every job.',
  },
  {
    label: 'Your Rates',
    desc: 'Set your own labor rates, material costs, and modifiers. Your numbers, your margins.',
  },
  {
    label: 'PDF Bids',
    desc: 'Generate clean, professional bid documents you can email or print on the spot.',
  },
  {
    label: 'Team Access',
    desc: 'Invite estimators and admins. Shared pricing, organized bids, everyone on the same page.',
  },
];

const steps = [
  { num: '01', title: 'Measure the Job', desc: 'Square footage, rooms, trim, doors — enter whatever the job needs.' },
  { num: '02', title: 'See the Numbers', desc: 'Labor, materials, and profit calculated instantly with your rates.' },
  { num: '03', title: 'Close the Deal', desc: 'Export a professional PDF and hand it over before you leave.' },
];

const pricingFeatures = [
  '5 calculator types',
  'Custom pricing & labor rates',
  'PDF bid export',
  'Team accounts & roles',
  'Unlimited bids',
  'Saved bid history',
];

/* ── Scroll reveal hook ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    el.querySelectorAll('.reveal').forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  return ref;
}

/* ── Component ── */
export function Landing() {
  const revealRef = useReveal();

  return (
    <div ref={revealRef} className="font-body min-h-screen bg-[#f5f2ed] text-[#1a2332] overflow-x-hidden">

      {/* ──────── Nav ──────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f1f2e]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/coatcalc-logo-cropped.png" alt="CoatCalc" className="h-12 drop-shadow-[0_0_1px_rgba(255,255,255,0.3)]" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="font-display text-sm font-700 tracking-wide uppercase text-white/70 hover:text-white transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="font-display text-sm font-700 tracking-wide uppercase bg-[#d4a24e] text-[#0f1f2e] px-5 py-2.5 hover:bg-[#e0b565] transition-colors"
            >
              Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ──────── Hero ──────── */}
      <section className="relative clip-diagonal bg-[#0f1f2e] grain pt-28 pb-32 sm:pb-40">
        <div className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 59px,
              rgba(255,255,255,0.3) 59px,
              rgba(255,255,255,0.3) 60px
            )`,
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="max-w-3xl">
            <div className="reveal">
              <img src="/coatcalc-logo-cropped.png" alt="CoatCalc" className="h-24 sm:h-32 mb-8" />
            </div>

            <h1 className="reveal reveal-delay-1 font-display text-6xl sm:text-7xl md:text-8xl font-900 uppercase leading-[0.9] tracking-tight text-white">
              Bid.<br />
              Paint.<br />
              <span className="text-[#0ea5a0]">Profit.</span>
            </h1>

            <p className="reveal reveal-delay-2 mt-8 text-lg sm:text-xl text-white/60 max-w-lg leading-relaxed">
              Stop guessing on estimates. Calculate labor, materials, and profit with
              your own rates — then hand over a professional bid before you leave.
            </p>

            <div className="reveal reveal-delay-3 mt-10 flex flex-wrap gap-4">
              <Link
                to="/signup"
                className="font-display text-base font-700 uppercase tracking-wide bg-[#d4a24e] text-[#0f1f2e] px-8 py-4 hover:bg-[#e0b565] transition-all hover:translate-y-[-1px]"
              >
                Start 14-Day Free Trial
              </Link>
              <a
                href="#pricing"
                className="font-display text-base font-700 uppercase tracking-wide text-white/70 border border-white/20 px-8 py-4 hover:text-white hover:border-white/40 transition-all"
              >
                See Pricing
              </a>
            </div>

            <p className="reveal reveal-delay-4 mt-6 font-display text-xs font-600 uppercase tracking-[0.2em] text-white/30">
              No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* ──────── Social proof strip ──────── */}
      <section className="relative -mt-8 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="reveal bg-white border-l-4 border-[#0ea5a0] px-6 py-5 shadow-lg shadow-black/5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <p className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e]">
              Made by painters for painters
            </p>
            <div className="h-px sm:h-8 sm:w-px bg-gray-200 flex-shrink-0" />
            <p className="text-sm text-gray-500 leading-relaxed">
              We've been in the field. We know what it takes to walk a job, price it right,
              and win the bid. CoatCalc is the tool we wished we had.
            </p>
          </div>
        </div>
      </section>

      {/* ──────── Features ──────── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="reveal mb-14">
          <p className="font-display text-sm font-700 uppercase tracking-[0.2em] text-[#0ea5a0] mb-3">What's Included</p>
          <h2 className="font-display text-4xl sm:text-5xl font-900 uppercase leading-[0.95] text-[#0f1f2e]">
            Everything You Need<br />to Bid Right
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
          {features.map((f, i) => (
            <div
              key={f.label}
              className={`reveal reveal-delay-${i + 1} swatch-border pl-5 py-4 bg-white hover:bg-white/80 transition-colors`}
            >
              <h3 className="font-display text-xl font-800 uppercase tracking-wide text-[#0f1f2e] mb-1">{f.label}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ──────── How It Works ──────── */}
      <section className="relative clip-diagonal-reverse bg-[#0f1f2e] grain pt-24 pb-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="reveal mb-16">
            <p className="font-display text-sm font-700 uppercase tracking-[0.2em] text-[#0ea5a0] mb-3">How It Works</p>
            <h2 className="font-display text-4xl sm:text-5xl font-900 uppercase leading-[0.95] text-white">
              Three Steps.<br />That's It.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((s, i) => (
              <div key={s.num} className={`reveal reveal-delay-${i + 1} relative`}>
                <div className="font-display text-[5rem] font-900 leading-none text-[#0ea5a0]/15 select-none">
                  {s.num}
                </div>
                <h3 className="font-display text-xl font-800 uppercase tracking-wide text-white -mt-4 mb-2">{s.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────── Pricing ──────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
        <div className="reveal grid md:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div>
            <p className="font-display text-sm font-700 uppercase tracking-[0.2em] text-[#0ea5a0] mb-3">Pricing</p>
            <h2 className="font-display text-4xl sm:text-5xl font-900 uppercase leading-[0.95] text-[#0f1f2e] mb-6">
              One Plan.<br />No Surprises.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-8">
              Everything included from day one. No feature gates, no per-user charges.
              Your whole crew gets access for one flat price.
            </p>
            <ul className="space-y-3">
              {pricingFeatures.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-[#1a2332]">
                  <span className="w-5 h-5 rounded-sm bg-[#0ea5a0]/10 flex items-center justify-center flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 16 16" className="text-[#0ea5a0]">
                      <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: pricing card */}
          <div className="relative">
            <div className="absolute -inset-3 bg-[#0ea5a0]/5 -rotate-2" />
            <div className="relative bg-[#0f1f2e] p-8 sm:p-10">
              <p className="font-display text-sm font-700 uppercase tracking-[0.2em] text-[#0ea5a0] mb-1">Pro Plan</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-display text-6xl font-900 text-white">$29</span>
                <span className="font-display text-xl font-600 text-white/40">/mo</span>
              </div>
              <p className="text-sm text-white/40 mb-8">per company &middot; billed monthly</p>

              <Link
                to="/signup"
                className="block w-full text-center font-display text-base font-700 uppercase tracking-wide bg-[#d4a24e] text-[#0f1f2e] py-4 hover:bg-[#e0b565] transition-all"
              >
                Start 14-Day Free Trial
              </Link>
              <p className="text-center text-xs text-white/30 mt-3">No credit card required</p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────── Bottom CTA ──────── */}
      <section className="bg-[#0f1f2e] grain relative">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="reveal">
            <h2 className="font-display text-4xl sm:text-5xl font-900 uppercase leading-[0.95] text-white mb-4">
              Ready to Bid Smarter?
            </h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              Join painting contractors who stopped guessing and started profiting.
            </p>
            <Link
              to="/signup"
              className="inline-block font-display text-base font-700 uppercase tracking-wide bg-[#d4a24e] text-[#0f1f2e] px-10 py-4 hover:bg-[#e0b565] transition-all hover:translate-y-[-1px]"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* ──────── Footer ──────── */}
      <footer className="bg-[#0a1520] text-white/30 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src="/coatcalc-logo-cropped.png" alt="CoatCalc" className="h-10 opacity-60" />
          <div className="flex items-center gap-6 font-display text-xs font-600 uppercase tracking-[0.15em]">
            <Link to="/login" className="hover:text-white/60 transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-white/60 transition-colors">Sign Up</Link>
            <a href="#pricing" className="hover:text-white/60 transition-colors">Pricing</a>
          </div>
          <p className="text-xs">&copy; {new Date().getFullYear()} CoatCalc</p>
        </div>
      </footer>
    </div>
  );
}
