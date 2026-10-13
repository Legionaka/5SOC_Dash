import PDFDocument from 'pdfkit';

export type InvoicePdfData = {
  id: string;
  amount: number;
  status: string;
  date: string;
  customerName: string;
  customerEmail: string;
};

function money(cents: number) {
  return (cents / 100).toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' });
}

export function createInvoicePdf(invoice: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 56, info: { Title: `Invoice INV-${invoice.id.slice(0, 8)}`, Author: 'Medi-Clinic' } });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    const teal = '#0f766e';
    const slate = '#334155';
    const muted = '#64748b';
    const light = '#f1f5f9';
    const invoiceNumber = `INV-${invoice.id.slice(0, 8).toUpperCase()}`;

    document.fillColor(teal).fontSize(24).font('Helvetica-Bold').text('Medi-Clinic');
    document.fillColor(muted).fontSize(9).font('Helvetica').text('Staff and patient care portal');
    document.moveUp(2).fillColor(slate).fontSize(22).font('Helvetica-Bold').text('INVOICE', { align: 'right' });
    document.fillColor(muted).fontSize(10).font('Helvetica').text(invoiceNumber, { align: 'right' });
    document.text(`Issued ${invoice.date}`, { align: 'right' });
    document.moveDown(3);

    document.roundedRect(56, document.y, 483, 1, 0.5).fillColor('#cbd5e1').fill();
    document.moveDown(2);
    document.fillColor(muted).fontSize(9).font('Helvetica-Bold').text('BILLED TO');
    document.moveDown(0.4);
    document.fillColor(slate).fontSize(12).font('Helvetica-Bold').text(invoice.customerName);
    document.fillColor(muted).fontSize(10).font('Helvetica').text(invoice.customerEmail);
    document.moveDown(2.5);

    const tableTop = document.y;
    document.rect(56, tableTop, 483, 32).fillColor(light).fill();
    document.fillColor(slate).fontSize(9).font('Helvetica-Bold').text('DESCRIPTION', 70, tableTop + 11);
    document.text('AMOUNT', 430, tableTop + 11, { width: 90, align: 'right' });
    document.fillColor(slate).fontSize(10).font('Helvetica').text('Clinic services', 70, tableTop + 55);
    document.text(money(invoice.amount), 430, tableTop + 55, { width: 90, align: 'right' });
    document.moveTo(56, tableTop + 88).lineTo(539, tableTop + 88).strokeColor('#e2e8f0').stroke();
    document.fillColor(muted).fontSize(10).text('Total', 350, tableTop + 108, { width: 90, align: 'right' });
    document.fillColor(teal).fontSize(18).font('Helvetica-Bold').text(money(invoice.amount), 430, tableTop + 103, { width: 90, align: 'right' });
    document.fillColor(muted).fontSize(10).font('Helvetica').text(`Status: ${invoice.status.toUpperCase()}`, 70, tableTop + 116);
    document.moveDown(8);

    document.fillColor(slate).fontSize(10).font('Helvetica-Bold').text('Thank you for choosing Medi-Clinic.');
    document.fillColor(muted).fontSize(9).font('Helvetica').text('Please retain this document for your records. Contact the clinic if you have questions about this invoice.');
    document.end();
  });
}
