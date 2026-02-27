// Company branding and contact information
export interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  licenseNumber?: string;
  logo?: string; // base64 encoded image
}

// Default company settings
export const defaultCompanySettings: CompanySettings = {
  name: 'Your Painting Company',
  address: '123 Main Street, City, State 12345',
  phone: '(555) 123-4567',
  email: 'contact@yourcompany.com',
  website: 'www.yourcompany.com',
  licenseNumber: '',
  logo: undefined,
};
