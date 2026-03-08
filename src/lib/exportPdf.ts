import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportPdfOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  filename: string;
  orientation?: 'portrait' | 'landscape';
}

export function exportPdf({ title, subtitle, headers, rows, filename, orientation = 'portrait' }: ExportPdfOptions) {
  const doc = new jsPDF({ orientation });

  // Title
  doc.setFontSize(16);
  doc.text(title, 14, 20);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 28);
    doc.setTextColor(0);
  }

  const startY = subtitle ? 34 : 28;

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [39, 103, 73], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(filename);
}
