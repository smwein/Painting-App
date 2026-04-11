import { Button } from '../common/Button';
import { Card, CardContent } from '../common/Card';

interface ExportButtonsProps {
  onSave: () => void;
  onExportPDF: () => void;
  onExportCustomerPDF: () => void;
  onSendToCustomer?: () => void;
  disabled?: boolean;
}

export function ExportButtons({ onSave, onExportPDF, onExportCustomerPDF, onSendToCustomer, disabled }: ExportButtonsProps) {
  return (
    <Card className="bg-white shadow-lg">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Internal Actions */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Internal Use
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={onSave}
                disabled={disabled}
                variant="secondary"
                fullWidth
                className="sm:flex-1"
              >
                💾 Save Bid
              </Button>
              <Button
                onClick={onExportPDF}
                disabled={disabled}
                variant="outline"
                fullWidth
                className="sm:flex-1"
              >
                📊 Internal PDF
              </Button>
            </div>
          </div>

          {/* Customer Action */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
              For Customer
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={onExportCustomerPDF}
                disabled={disabled}
                variant="outline"
                fullWidth
                className="sm:flex-1"
              >
                📄 Customer PDF
              </Button>
              {onSendToCustomer && (
                <Button
                  onClick={onSendToCustomer}
                  disabled={disabled}
                  variant="primary"
                  fullWidth
                  className="sm:flex-1"
                  size="lg"
                >
                  📧 Send to Customer
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
