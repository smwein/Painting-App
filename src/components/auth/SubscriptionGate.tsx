import { Navigate } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { org, loading } = useOrganization();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🎨</div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!org) return <Navigate to="/onboarding" replace />;

  const isTrialing = org.planStatus === 'trialing';
  const trialExpired = isTrialing && new Date(org.trialEndsAt) < new Date();

  if (org.planStatus === 'canceled' || trialExpired) {
    return <Navigate to="/subscribe" replace />;
  }

  return <>{children}</>;
}
