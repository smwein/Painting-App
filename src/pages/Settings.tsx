import React, { useState, useRef } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';

export function Settings() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState(settings);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    updateSettings(formData);
    alert('Settings saved successfully!');
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default settings?')) {
      resetSettings();
      setFormData(settings);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo file size must be less than 2MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData((prev) => ({
          ...prev,
          logo: base64String,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logo: undefined,
    }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Company Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Company Name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
          />
          <Input
            label="Address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleInputChange}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Website (optional)"
              name="website"
              type="text"
              value={formData.website || ''}
              onChange={handleInputChange}
            />
            <Input
              label="License Number (optional)"
              name="licenseNumber"
              type="text"
              value={formData.licenseNumber || ''}
              onChange={handleInputChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.logo ? (
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-center">
                <img
                  src={formData.logo}
                  alt="Company Logo"
                  className="max-h-32 max-w-full object-contain"
                />
              </div>
              <Button onClick={handleRemoveLogo} variant="outline" fullWidth>
                Remove Logo
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Upload your company logo to appear on PDF bid estimates
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                fullWidth
              >
                Upload Logo
              </Button>
            </div>
          )}
          <p className="text-xs text-gray-500">
            Recommended: PNG or JPG, max 2MB
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleSave} variant="primary" fullWidth>
          Save Settings
        </Button>
        <Button onClick={handleReset} variant="outline" fullWidth>
          Reset to Default
        </Button>
      </div>
    </div>
  );
}
