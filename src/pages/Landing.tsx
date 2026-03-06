import { Link } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-primary-600">
        <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="16" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="2" y="16" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="16" y="16" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    title: '5 Calculator Types',
    desc: 'Interior & exterior, square footage & detailed, plus per-room. Pick the right tool for every job.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-primary-600">
        <path d="M14 4v20M4 14h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    title: 'Custom Pricing',
    desc: 'Set your own labor rates, material costs, and modifiers. Your numbers, your margins.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-primary-600">
        <path d="M6 4h12l4 4v16a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M14 8v4M8 18h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    title: 'PDF Export',
    desc: 'Generate clean, professional bid documents you can email or print on the spot.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-primary-600">
        <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="20" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M2 24c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 15c3 0 6 1.5 6 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    title: 'Team Accounts',
    desc: 'Invite estimators and admins. Everyone shares pricing and settings, bids stay organized.',
  },
];

const steps = [
  { num: '01', title: 'Enter the Job Details', desc: 'Square footage, rooms, trim, doors — whatever the job needs.' },
  { num: '02', title: 'Review the Bid', desc: 'See labor, materials, and profit broken down instantly.' },
  { num: '03', title: 'Send to the Customer', desc: 'Export a professional PDF and close the deal.' },
];

const pricingFeatures = [
  '5 calculator types',
  'Custom pricing & labor rates',
  'PDF bid export',
  'Team accounts & roles',
  'Unlimited bids',
  'Saved bid history',
];

export function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <img src="/coatcalc-logo.png" alt="CoatCalc" className="h-8" />
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">
              Sign In
            </Link>
            <Link to="/signup" className="text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-blue-50" />
        <div className="absolute top-20 -right-20 w-72 h-72 bg-primary-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-blue-100 rounded-full opacity-30 blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            <span className="text-xs font-semibold text-primary-700 tracking-wide uppercase">14-Day Free Trial</span>
          </div>

          <img src="/coatcalc-logo.png" alt="CoatCalc" className="h-20 mx-auto mb-6" />

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1] max-w-3xl mx-auto">
            Accurate Painting Bids
            <span className="block text-primary-600">in Minutes</span>
          </h1>

          <p className="mt-4 text-lg font-semibold text-primary-600">Made by painters for painters</p>

          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Stop guessing on estimates. Calculate labor, materials, and profit with your own rates — then send a professional bid before you leave the walkthrough.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="w-full sm:w-auto bg-primary-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-all hover:shadow-xl hover:shadow-primary-600/25 text-sm"
            >
              Start Free Trial
            </Link>
            <a
              href="#pricing"
              className="w-full sm:w-auto text-gray-600 font-medium px-8 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:text-gray-900 transition-all text-sm"
            >
              See Pricing
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Everything You Need to Bid</h2>
          <p className="mt-3 text-gray-500 max-w-lg mx-auto">Made by painters for painters. No bloat, no learning curve.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group bg-gray-50 hover:bg-white border border-gray-100 hover:border-primary-200 rounded-2xl p-6 transition-all hover:shadow-lg hover:shadow-primary-100/50"
            >
              <div className="w-12 h-12 rounded-xl bg-white group-hover:bg-primary-50 border border-gray-200 group-hover:border-primary-200 flex items-center justify-center transition-colors mb-4">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">How It Works</h2>
            <p className="mt-3 text-gray-500">Three steps. That's it.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="relative">
                <div className="text-5xl font-black text-primary-100 mb-3 leading-none">{s.num}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Simple Pricing</h2>
          <p className="mt-3 text-gray-500">One plan. Everything included.</p>
        </div>

        <div className="max-w-sm mx-auto">
          <div className="bg-white border-2 border-primary-200 rounded-2xl p-8 shadow-xl shadow-primary-100/30">
            <div className="text-center mb-6">
              <div className="text-5xl font-extrabold text-gray-900">
                $29<span className="text-lg font-medium text-gray-400">/mo</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">per company</p>
            </div>

            <ul className="space-y-3 mb-8">
              {pricingFeatures.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-700">
                  <svg width="16" height="16" viewBox="0 0 16 16" className="text-primary-500 flex-shrink-0">
                    <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              to="/signup"
              className="block w-full text-center bg-primary-600 text-white font-semibold py-3.5 rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-all hover:shadow-xl text-sm"
            >
              Start 14-Day Free Trial
            </Link>
            <p className="text-xs text-gray-400 text-center mt-3">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img src="/coatcalc-logo.png" alt="CoatCalc" className="h-7" />
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link to="/login" className="hover:text-gray-600 transition-colors">Sign In</Link>
              <Link to="/signup" className="hover:text-gray-600 transition-colors">Sign Up</Link>
              <a href="#pricing" className="hover:text-gray-600 transition-colors">Pricing</a>
            </div>
            <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} CoatCalc</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
