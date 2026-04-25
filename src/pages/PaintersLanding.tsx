import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { setAttributionIfEmpty } from '../utils/attribution';

export function PaintersLanding() {
  useEffect(() => {
    setAttributionIfEmpty({
      source: 'mastermind',
      medium: 'loom',
      campaign: 'partner-launch',
    });
  }, []);

  return <Navigate to="/" replace />;
}
