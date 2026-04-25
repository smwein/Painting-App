export interface PublicQuote {
  id: string;
  organizationId: string;
  bidId: string;
  publicToken: string;
  customerEmail: string;
  customerName: string;
  status: 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
  enabledPages: string[];
  acceptedAt?: string;
  signatureText?: string;
  viewedAt?: string;
  viewCount: number;
  expiresAt: string;
  sentBy: string;
  createdAt: string;
  discountType?: 'percent' | 'fixed' | null;
  discountValue?: number | null;
  discountExpiresAt?: string | null;
  acceptedTotal?: number | null;
}
