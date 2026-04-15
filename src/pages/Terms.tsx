import { Link } from 'react-router-dom';

export function Terms() {
  return (
    <div className="min-h-screen bg-[#f5f2ed]">
      <nav className="bg-[#0f1f2e] shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center">
          <Link to="/" className="flex items-center">
            <img src="/coatcalc-logo-final.png" alt="CoatCalc" className="h-10 drop-shadow-[0_0_1px_rgba(255,255,255,0.3)]" />
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-3xl font-900 uppercase text-[#0f1f2e] mb-2">
          Terms of Service
        </h1>
        <p className="font-display text-sm font-700 uppercase tracking-[0.2em] text-[#0ea5a0] mb-6">
          CoatCalc Painting Bid Calculator
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Last Updated: March 2026
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          1. Acceptance of Terms
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          By accessing or using CoatCalc, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service. These terms apply to all users, including organization owners, admins, and estimators.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          2. Description of Service
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          CoatCalc is a cloud-based painting bid calculator designed for professional painting contractors. The service includes bid calculators for interior, exterior, and commercial projects, PDF export of estimates, and team collaboration features. Features and functionality may change over time as we continue to improve the platform.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          3. Account Registration
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your password and account. Each account is associated with a single organization, and you may not share your login credentials with others. You must notify us immediately of any unauthorized use of your account.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          4. Billing & Payments
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          CoatCalc offers two plans: Basic at $29 per month and Pro at $49 per month, both processed securely through Stripe. New accounts receive a 14-day free trial with full Pro features and no credit card required. You may cancel or change your plan at any time through the billing portal. Refunds are not provided for partial billing periods.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          5. Acceptable Use
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          You agree not to use CoatCalc for any illegal or unauthorized purpose. You may not reverse engineer, decompile, or disassemble any part of the service. Automated scraping, data harvesting, or use of bots is strictly prohibited. Sharing account credentials or allowing unauthorized access to your organization is not permitted.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          6. Data & Privacy
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Your privacy is important to us. Our collection and use of personal information is governed by our{' '}
          <Link to="/privacy" className="text-[#0ea5a0] hover:underline">Privacy Policy</Link>, which is incorporated into these Terms of Service. By using CoatCalc, you consent to the data practices described therein.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          7. Intellectual Property
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          CoatCalc and its original content, features, and functionality are owned by CoatCalc and are protected by applicable intellectual property laws. You retain full ownership of all bid data, estimates, and other content you create using the service. We claim no ownership over your data.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          8. Limitation of Liability
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          CoatCalc is provided "as is" and "as available" without warranties of any kind, express or implied. We are not liable for any lost bids, inaccurate estimates, or business decisions made based on calculations from the service. You should always use professional judgment when preparing and submitting bids to clients.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          9. Termination
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          We reserve the right to suspend or terminate your account if you violate these Terms of Service. You may cancel your account and subscription at any time through the billing portal. Upon termination, your access to the service will cease, though we may retain certain data as required by law.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          10. Changes to Terms
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          We may update these Terms of Service from time to time. Changes will be posted on this page with an updated revision date. Your continued use of CoatCalc after changes are posted constitutes your acceptance of the revised terms.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          11. Contact
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Have questions about these terms? Visit our{' '}
          <Link to="/support" className="text-[#0ea5a0] hover:underline">support page</Link> and we'll be happy to help.
        </p>
      </div>
    </div>
  );
}
