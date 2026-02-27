import jsPDF from 'jspdf';
import type { Bid } from '../types/bid.types';
import type { CompanySettings } from '../types/settings.types';
import { format } from 'date-fns';

/**
 * Generate a professional PDF bid estimate
 */
export function generateBidPDF(bid: Bid, companySettings: CompanySettings): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Helper function to add text with automatic line wrapping
  const addText = (text: string, x: number, maxWidth?: number) => {
    if (maxWidth) {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, yPos);
      yPos += lines.length * 7;
    } else {
      doc.text(text, x, yPos);
      yPos += 7;
    }
  };

  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number = 20) => {
    if (yPos + requiredSpace > 280) {
      doc.addPage();
      yPos = 20;
    }
  };

  // ===== HEADER =====
  // Company logo (if available)
  if (companySettings.logo) {
    try {
      doc.addImage(companySettings.logo, 'PNG', 15, yPos, 40, 20);
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  }

  // Company info (aligned right)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const companyInfoX = pageWidth - 15;
  doc.text(companySettings.name, companyInfoX, yPos, { align: 'right' });
  yPos += 5;
  doc.text(companySettings.address, companyInfoX, yPos, { align: 'right' });
  yPos += 5;
  doc.text(companySettings.phone, companyInfoX, yPos, { align: 'right' });
  yPos += 5;
  doc.text(companySettings.email, companyInfoX, yPos, { align: 'right' });
  yPos += 5;
  if (companySettings.website) {
    doc.text(companySettings.website, companyInfoX, yPos, { align: 'right' });
    yPos += 5;
  }
  if (companySettings.licenseNumber) {
    doc.text(`License: ${companySettings.licenseNumber}`, companyInfoX, yPos, { align: 'right' });
    yPos += 5;
  }

  yPos += 10;

  // ===== TITLE =====
  checkPageBreak(30);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('BID ESTIMATE', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${format(new Date(), 'MMMM d, yyyy')}`, 15, yPos);
  yPos += 10;

  // ===== CUSTOMER INFORMATION =====
  checkPageBreak(40);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER INFORMATION', 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  addText(`Name: ${bid.customer.name}`, 15);
  addText(`Address: ${bid.customer.address}`, 15);
  addText(`Phone: ${bid.customer.phone}`, 15);
  if (bid.customer.email) {
    addText(`Email: ${bid.customer.email}`, 15);
  }
  if (bid.customer.jobDate) {
    addText(`Job Date: ${format(new Date(bid.customer.jobDate), 'MMMM d, yyyy')}`, 15);
  }
  if (bid.customer.notes) {
    yPos += 3;
    doc.setFont('helvetica', 'italic');
    addText(`Notes: ${bid.customer.notes}`, 15, pageWidth - 30);
    doc.setFont('helvetica', 'normal');
  }

  yPos += 5;

  // ===== COST BREAKDOWN =====
  checkPageBreak(50);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('COST BREAKDOWN', 15, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Labor
  doc.setFont('helvetica', 'bold');
  doc.text('Labor:', 20, yPos);
  doc.text(`$${bid.result.labor.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += 7;

  // Materials
  if (bid.result.materials.items.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Materials:', 20, yPos);
    doc.text(`$${bid.result.materials.totalCost.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
    yPos += 7;

    // Material details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const item of bid.result.materials.items) {
      checkPageBreak();
      doc.text(`  ${item.name}`, 25, yPos);
      doc.text(`${item.quantity} gal × $${item.pricePerGallon}`, pageWidth - 60, yPos, { align: 'right' });
      doc.text(`$${item.cost.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
      yPos += 6;
    }
    doc.setFontSize(10);
    yPos += 3;
  }

  // Subtotal
  const subtotal = bid.result.labor + bid.result.materials.totalCost;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 20, yPos);
  doc.text(`$${subtotal.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += 7;

  // Profit
  if (bid.result.profit > 0) {
    doc.text('Profit:', 20, yPos);
    doc.text(`$${bid.result.profit.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
    yPos += 10;
  } else {
    yPos += 5;
  }

  // Draw line
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  // ===== TOTAL =====
  checkPageBreak(20);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', 20, yPos);
  doc.text(`$${bid.result.total.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += 15;

  // ===== FOOTER =====
  checkPageBreak(30);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);

  const footerText = [
    'This estimate is valid for 30 days from the date above.',
    'Payment terms: 50% deposit, 50% upon completion.',
    'Thank you for your business!',
  ];

  footerText.forEach((line) => {
    checkPageBreak();
    doc.text(line, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
  });

  return doc;
}

/**
 * Download the PDF with a formatted filename
 */
export function downloadBidPDF(bid: Bid, companySettings: CompanySettings): void {
  const pdf = generateBidPDF(bid, companySettings);

  // Create filename: Bid_CustomerName_Date.pdf
  const customerName = bid.customer.name.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const filename = `Bid_${customerName}_${dateStr}.pdf`;

  pdf.save(filename);
}
