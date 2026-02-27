import { Button } from '../common/Button';

interface ExportButtonsProps {
  onSave: () => void;
  onExportPDF: () => void;
  disabled?: boolean;
}

export function ExportButtons({ onSave, onExportPDF, disabled }: ExportButtonsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
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
        variant="primary"
        fullWidth
        className="sm:flex-1"
      >
        📄 Export PDF
      </Button>
    </div>
  );
}
