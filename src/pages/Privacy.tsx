import { Link } from 'react-router-dom';

export function Privacy() {
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
          Privacy Policy
        </h1>
        <p className="font-display text-sm font-700 uppercase tracking-[0.2em] text-[#0ea5a0] mb-6">
          CoatCalc Painting Bid Calculator
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Last Updated: March 2026
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          1. Information We Collect
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          When you create an account, we collect your email address, name, and company information (company name, address, phone number, and contractor license number). We also store the bid and estimate data you create within the app. Basic usage data such as pages visited and features used may be collected to help us improve the product.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          2. How We Use Your Information
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          We use your information to provide and operate the CoatCalc service, including generating bids, managing your organization, and processing payments. We also use your email to send transactional messages such as team invites and account confirmations. Usage data helps us understand how the product is used so we can make improvements.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          3. Data Storage & Security
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Your data is stored in a PostgreSQL database hosted by Supabase with encryption in transit via TLS. We enforce row-level security policies to ensure strict data isolation between organizations — your data is only accessible to members of your organization. We take reasonable measures to protect your information, but no method of transmission or storage is 100% secure.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          4. Payment Processing
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          All payment processing is handled securely by Stripe. We never store your credit card number or full payment details on our servers. Stripe's collection and use of your payment information is governed by their own{' '}
          <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#0ea5a0] hover:underline">privacy policy</a>.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          5. Email Communications
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          We send transactional emails via Resend from noreply@coatcalc.com, including team invitations and account confirmations. We do not send marketing emails or newsletters. All email communication is directly related to your use of the service.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          6. Cookies & Local Storage
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          CoatCalc uses localStorage to store your authentication session token and to cache settings locally for faster performance. We do not use third-party tracking cookies or analytics services that track you across other websites.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          7. Third-Party Services
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          We rely on the following third-party services to operate CoatCalc:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600 leading-relaxed mb-4 space-y-1">
          <li><strong>Supabase</strong> — database hosting and authentication</li>
          <li><strong>Stripe</strong> — payment processing</li>
          <li><strong>Resend</strong> — transactional email delivery</li>
          <li><strong>Google</strong> — OAuth sign-in</li>
        </ul>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Each service has its own privacy policy governing how they handle your data.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          8. Data Retention & Deletion
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Your data is retained for as long as your account is active. If you wish to delete your account, contact our support team and we will process your request. Bid data and personal information will be deleted within 30 days of account closure.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          9. Your Rights
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          You have the right to access and update your personal information at any time through your account settings. You can export your bids as PDF documents. You may also request a full deletion of your account and associated data by contacting support.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          10. Children's Privacy
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          CoatCalc is not directed at children under the age of 13. We do not knowingly collect personal information from children. If we become aware that a child under 13 has provided us with personal data, we will take steps to delete that information promptly.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          11. Changes to This Policy
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date. Your continued use of CoatCalc after any changes constitutes your acceptance of the revised policy.
        </p>

        <h2 className="font-display text-lg font-800 uppercase tracking-wide text-[#0f1f2e] mt-8 mb-3">
          12. Contact
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Have questions about this privacy policy? Visit our{' '}
          <Link to="/support" className="text-[#0ea5a0] hover:underline">support page</Link> and we'll be happy to help.
        </p>
      </div>
    </div>
  );
}
