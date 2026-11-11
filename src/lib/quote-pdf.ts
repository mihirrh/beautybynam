/**
 * Quote PDF generator (PDFKit).
 *
 * Runs entirely in the browser: customer details never leave the device.
 * Page 1 is the branded cover (logo, about the business, thank-you message).
 * Following pages carry the quotation itself.
 *
 * All money is handled as integer pence to avoid floating point drift.
 */
import * as pdfkit from 'pdfkit';

// PDFKit 0.20 exposes PDFDocument as a named export; @types/pdfkit only types the default.
const PDFDocument = (pdfkit as unknown as { PDFDocument: new (options?: PDFKit.PDFDocumentOptions) => PDFKit.PDFDocument }).PDFDocument;

export interface QuoteItem {
  description: string;
  qty: number;
  unitPence: number;
}

export interface QuoteData {
  reference: string;
  /** ISO date (yyyy-mm-dd) the quote was issued. */
  issueDate: string;
  validDays: number;
  customer: { name: string; email: string; phone: string };
  event: { date: string; time: string; venue: string; people: string };
  items: QuoteItem[];
  travel: { label: string; amountPence: number } | null;
  vat: boolean;
  vatNumber: string;
  depositPence: number;
  notes: string;
  payment: string;
  terms: string[];
}

export interface Branding {
  businessName: string;
  about: string;
  thankYou: string;
  /** e.g. email, phone, Instagram. Only facts that exist. */
  contactLines: string[];
}

export interface PdfAssets {
  display: Uint8Array;
  displayItalic: Uint8Array;
  sans: Uint8Array;
  sansMedium: Uint8Array;
  script: Uint8Array;
  /** Transparent PNG logo. Drawn straight onto the page, so it blends with any background. */
  logo: Uint8Array;
}

export const VAT_RATE = 0.2;

export interface Totals {
  lines: { description: string; qty: number; unitPence: number; totalPence: number; isTravel: boolean }[];
  subtotalPence: number;
  vatPence: number;
  totalPence: number;
  depositPence: number;
  balancePence: number;
}

/** Single source of truth for the maths, used by both the live summary and the PDF. */
export function calculate(data: Pick<QuoteData, 'items' | 'travel' | 'vat' | 'depositPence'>): Totals {
  const lines = data.items.map((i) => ({
    description: i.description,
    qty: i.qty,
    unitPence: i.unitPence,
    totalPence: Math.round(i.qty * i.unitPence),
    isTravel: false,
  }));
  if (data.travel && data.travel.amountPence > 0) {
    lines.push({
      description: data.travel.label || 'Travel',
      qty: 1,
      unitPence: data.travel.amountPence,
      totalPence: data.travel.amountPence,
      isTravel: true,
    });
  }
  const subtotalPence = lines.reduce((sum, l) => sum + l.totalPence, 0);
  const vatPence = data.vat ? Math.round(subtotalPence * VAT_RATE) : 0;
  const totalPence = subtotalPence + vatPence;
  const depositPence = Math.min(Math.max(data.depositPence, 0), totalPence);
  return { lines, subtotalPence, vatPence, totalPence, depositPence, balancePence: totalPence - depositPence };
}

export const gbp = (pence: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);

const longDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.valueOf())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/* Palette (matches the website). */
const IVORY = '#FDFCF0';
const GOLD = '#A8884F';
const TEXT = '#1A1A1A';
const MUTED = '#5F584D';
const RULE = '#D9CCB2';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 54; // side margin
const BOTTOM = 70; // reserved for footer
const CONTENT_W = PAGE_W - M * 2;

export async function buildQuotePdf(data: QuoteData, brand: Branding, assets: PdfAssets): Promise<Blob> {
  const { toBlob } = await import('pdfkit/output');
  // The browser build ships no font data until it is registered, and PDFKit
  // initialises Helvetica as its default. (The Node build has no such function.)
  const register = (pdfkit as unknown as { registerStdFonts?: (...fonts: unknown[]) => void }).registerStdFonts;
  if (register) {
    const { default: Helvetica } = await import('pdfkit/standard-fonts/Helvetica');
    register(Helvetica);
  }

  const totals = calculate(data);
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    bufferPages: true,
    info: {
      Title: `Quotation ${data.reference}`,
      Author: brand.businessName,
      Subject: `Quotation for ${data.customer.name}`,
    },
  });
  const output = toBlob(doc);

  doc.registerFont('Display', assets.display);
  doc.registerFont('DisplayItalic', assets.displayItalic);
  doc.registerFont('Sans', assets.sans);
  doc.registerFont('SansMedium', assets.sansMedium);
  doc.registerFont('Script', assets.script);

  /* =================================================================== COVER */
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(IVORY);
  doc.rect(0, 0, PAGE_W, 5).fill('#C9A96E');

  // The logo is transparent, so it sits directly on the ivory page: no disc, no box.
  const logoW = 250;
  doc.image(assets.logo as unknown as ArrayBuffer, (PAGE_W - logoW) / 2, 64, { width: logoW });

  let y = 64 + logoW * (936 / 1200) + 40;
  const eyebrow = (text: string, yy: number, color = GOLD) => {
    doc.font('SansMedium').fontSize(7.5).fillColor(color).text(text.toUpperCase(), M, yy, {
      width: CONTENT_W,
      align: 'center',
      characterSpacing: 3,
    });
  };

  eyebrow('About us', y, GOLD);
  y += 22;
  doc.font('Display').fontSize(28).fillColor(TEXT).text(`A little about us`, M + 30, y, {
    width: CONTENT_W - 60,
    align: 'center',
  });
  y = doc.y + 18;
  doc.font('Sans').fontSize(10.5).fillColor(MUTED).text(brand.about, M + 50, y, {
    width: CONTENT_W - 100,
    align: 'center',
    lineGap: 4.5,
  });
  y = doc.y + 38;

  // Fine gold divider.
  doc.moveTo(PAGE_W / 2 - 28, y).lineTo(PAGE_W / 2 + 28, y).lineWidth(0.7).strokeColor(GOLD).stroke();
  y += 26;

  doc.font('Script').fontSize(40).fillColor(GOLD).text('Thank you', M, y, { width: CONTENT_W, align: 'center' });
  y = doc.y + 8;
  doc.font('DisplayItalic').fontSize(14.5).fillColor(TEXT).text(brand.thankYou, M + 50, y, {
    width: CONTENT_W - 100,
    align: 'center',
    lineGap: 4,
  });

  // Prepared-for line anchored to the bottom of the cover.
  const coverFooterY = PAGE_H - 92;
  doc.moveTo(M, coverFooterY - 14).lineTo(PAGE_W - M, coverFooterY - 14).lineWidth(0.5).strokeColor(RULE).stroke();
  doc.font('SansMedium').fontSize(7.5).fillColor(GOLD).text('PREPARED FOR', M, coverFooterY, { characterSpacing: 2.5 });
  doc.font('Display').fontSize(17).fillColor(TEXT).text(data.customer.name, M, coverFooterY + 14, { width: 300 });
  doc.font('Sans').fontSize(8.5).fillColor(MUTED);
  doc.text(`Quotation ${data.reference}`, PAGE_W - M - 220, coverFooterY, { width: 220, align: 'right' });
  doc.text(longDate(data.issueDate), PAGE_W - M - 220, coverFooterY + 14, { width: 220, align: 'right' });

  /* ================================================================== INNER */
  let first = true;
  const newPage = () => {
    doc.addPage({ size: 'A4', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    doc.rect(0, 0, PAGE_W, 5).fill('#C9A96E');
    if (first) {
      first = false;
      // Letterhead: logo left, quote meta right.
      doc.image(assets.logo as unknown as ArrayBuffer, M, 40, { width: 86 });
      doc.font('SansMedium').fontSize(7.5).fillColor(GOLD).text('QUOTATION', PAGE_W - M - 220, 46, {
        width: 220,
        align: 'right',
        characterSpacing: 3,
      });
      doc.font('Display').fontSize(20).fillColor(TEXT).text(data.reference, PAGE_W - M - 220, 58, { width: 220, align: 'right' });
      doc.font('Sans').fontSize(8.5).fillColor(MUTED);
      const valid = addDays(data.issueDate, data.validDays);
      doc.text(`Issued ${longDate(data.issueDate)}`, PAGE_W - M - 220, 84, { width: 220, align: 'right' });
      if (data.validDays > 0) doc.text(`Valid until ${longDate(valid)}`, PAGE_W - M - 220, 96, { width: 220, align: 'right' });
      y = 140;
    } else {
      doc.font('SansMedium').fontSize(7.5).fillColor(GOLD).text(`QUOTATION ${data.reference}`, M, 34, { characterSpacing: 2.5 });
      y = 62;
    }
  };

  const ensure = (needed: number) => {
    if (y + needed > PAGE_H - BOTTOM) newPage();
  };

  const label = (text: string, x: number, yy: number, width = 220) => {
    doc.font('SansMedium').fontSize(7.5).fillColor(GOLD).text(text.toUpperCase(), x, yy, { width, characterSpacing: 2.5 });
  };

  newPage();
  doc.moveTo(M, y - 10).lineTo(PAGE_W - M, y - 10).lineWidth(0.5).strokeColor(RULE).stroke();

  // Prepared for / Event
  const colW = (CONTENT_W - 30) / 2;
  label('Prepared for', M, y, colW);
  label('Event', M + colW + 30, y, colW);
  y += 16;
  const topOfCols = y;

  doc.font('Display').fontSize(15).fillColor(TEXT).text(data.customer.name, M, y, { width: colW });
  let leftY = doc.y + 3;
  doc.font('Sans').fontSize(9).fillColor(MUTED);
  for (const line of [data.customer.email, data.customer.phone].filter(Boolean)) {
    doc.text(line, M, leftY, { width: colW });
    leftY = doc.y + 1;
  }

  let rightY = topOfCols;
  const dateTime = [longDate(data.event.date), data.event.time].filter(Boolean).join(' at ');
  doc.font('Display').fontSize(15).fillColor(TEXT).text(dateTime || 'Date to be confirmed', M + colW + 30, rightY, { width: colW });
  rightY = doc.y + 3;
  doc.font('Sans').fontSize(9).fillColor(MUTED);
  for (const line of [data.event.venue, data.event.people ? `${data.event.people} ${data.event.people === '1' ? 'person' : 'people'}` : ''].filter(Boolean)) {
    doc.text(line, M + colW + 30, rightY, { width: colW });
    rightY = doc.y + 1;
  }
  y = Math.max(leftY, rightY) + 28;

  /* ------------------------------------------------------------- items table */
  const cDesc = M;
  const wQty = 40;
  const wUnit = 82;
  const wAmt = 88;
  const xAmt = PAGE_W - M - wAmt;
  const xUnit = xAmt - wUnit;
  const xQty = xUnit - wQty;
  const wDesc = xQty - cDesc - 12;

  const tableHead = () => {
    doc.font('SansMedium').fontSize(7.5).fillColor(GOLD);
    doc.text('DESCRIPTION', cDesc, y, { characterSpacing: 2 });
    doc.text('QTY', xQty, y, { width: wQty, align: 'right', characterSpacing: 2 });
    doc.text('PRICE', xUnit, y, { width: wUnit, align: 'right', characterSpacing: 2 });
    doc.text('AMOUNT', xAmt, y, { width: wAmt, align: 'right', characterSpacing: 2 });
    y += 16;
    doc.moveTo(M, y).lineTo(PAGE_W - M, y).lineWidth(0.7).strokeColor(GOLD).stroke();
    y += 10;
  };
  ensure(60);
  tableHead();

  for (const line of totals.lines) {
    doc.font('Sans').fontSize(10);
    const h = Math.max(doc.heightOfString(line.description, { width: wDesc, lineGap: 2 }), 14);
    if (y + h + 16 > PAGE_H - BOTTOM) {
      newPage();
      tableHead();
    }
    doc.font('Sans').fontSize(10).fillColor(TEXT).text(line.description, cDesc, y, { width: wDesc, lineGap: 2 });
    doc.text(String(line.qty), xQty, y, { width: wQty, align: 'right' });
    doc.text(gbp(line.unitPence), xUnit, y, { width: wUnit, align: 'right' });
    doc.font('SansMedium').text(gbp(line.totalPence), xAmt, y, { width: wAmt, align: 'right' });
    y += h + 10;
    doc.moveTo(M, y - 4).lineTo(PAGE_W - M, y - 4).lineWidth(0.4).strokeColor(RULE).stroke();
  }
  y += 10;

  /* ----------------------------------------------------------------- totals */
  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: 'Subtotal', value: gbp(totals.subtotalPence) },
  ];
  if (data.vat) rows.push({ label: `VAT (${Math.round(VAT_RATE * 100)}%)`, value: gbp(totals.vatPence) });
  const totalsH = rows.length * 18 + 44 + (totals.depositPence > 0 ? 40 : 0);
  ensure(totalsH);

  const xLabel = PAGE_W - M - 250;
  for (const r of rows) {
    doc.font('Sans').fontSize(9.5).fillColor(MUTED).text(r.label, xLabel, y, { width: 150 });
    doc.fillColor(TEXT).text(r.value, xAmt - 40, y, { width: wAmt + 40, align: 'right' });
    y += 18;
  }
  doc.moveTo(xLabel, y + 2).lineTo(PAGE_W - M, y + 2).lineWidth(0.7).strokeColor(GOLD).stroke();
  y += 12;
  doc.font('Display').fontSize(16).fillColor(TEXT).text(data.vat ? 'Total (inc. VAT)' : 'Total', xLabel, y, { width: 150 });
  doc.font('Display').fontSize(20).fillColor(TEXT).text(gbp(totals.totalPence), xAmt - 70, y - 2, { width: wAmt + 70, align: 'right' });
  y += 32;

  if (totals.depositPence > 0) {
    doc.font('Sans').fontSize(9.5).fillColor(MUTED).text('Deposit to secure your date', xLabel, y, { width: 170 });
    doc.fillColor(TEXT).text(gbp(totals.depositPence), xAmt - 40, y, { width: wAmt + 40, align: 'right' });
    y += 18;
    doc.fillColor(MUTED).text('Balance remaining', xLabel, y, { width: 170 });
    doc.fillColor(TEXT).text(gbp(totals.balancePence), xAmt - 40, y, { width: wAmt + 40, align: 'right' });
    y += 18;
  }
  if (data.vat && data.vatNumber) {
    y += 4;
    doc.font('Sans').fontSize(8).fillColor(MUTED).text(`VAT registration number: ${data.vatNumber}`, xLabel, y, { width: 250, align: 'right' });
    y += 12;
  }
  y += 22;

  /* -------------------------------------------------------- notes / payment / terms */
  const block = (title: string, body: string[], numbered = false) => {
    if (body.length === 0) return;
    doc.font('Sans').fontSize(9.5);
    const bodyH = body.reduce((s, p) => s + doc.heightOfString(p, { width: CONTENT_W - (numbered ? 18 : 0), lineGap: 2.5 }) + 5, 0);
    ensure(Math.min(bodyH + 34, 150));
    label(title, M, y, CONTENT_W);
    y += 16;
    body.forEach((p, i) => {
      doc.font('Sans').fontSize(9.5);
      const h = doc.heightOfString(p, { width: CONTENT_W - (numbered ? 18 : 0), lineGap: 2.5 });
      ensure(h + 8);
      if (numbered) {
        doc.font('SansMedium').fontSize(8.5).fillColor(GOLD).text(String(i + 1).padStart(2, '0'), M, y + 0.5, { width: 16 });
      }
      doc.font('Sans').fontSize(9.5).fillColor(TEXT).text(p, M + (numbered ? 18 : 0), y, { width: CONTENT_W - (numbered ? 18 : 0), lineGap: 2.5 });
      y += h + 5;
    });
    y += 14;
  };

  const lines = (text: string) => text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  block('Notes', lines(data.notes));
  block('Payment', lines(data.payment));
  block('Key terms', data.terms.filter(Boolean), true);

  ensure(40);
  doc.font('Sans').fontSize(8.5).fillColor(MUTED).text('Our full terms and conditions can be found on our website. Travel costs are charged in addition to the service prices where shown.', M, y, {
    width: CONTENT_W,
    lineGap: 2,
  });
  y = doc.y + 18;

  if (brand.contactLines.length > 0) {
    ensure(30);
    doc.font('SansMedium').fontSize(8.5).fillColor(TEXT).text(brand.contactLines.join('   ·   '), M, y, { width: CONTENT_W });
  }

  /* ----------------------------------------------------------------- footers */
  const range = doc.bufferedPageRange();
  for (let i = 1; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.moveTo(M, PAGE_H - 48).lineTo(PAGE_W - M, PAGE_H - 48).lineWidth(0.4).strokeColor(RULE).stroke();
    doc.font('Sans').fontSize(7.5).fillColor(MUTED);
    doc.text(brand.businessName, M, PAGE_H - 38, { width: 250, lineBreak: false });
    doc.text(`Page ${i + 1} of ${range.count}`, PAGE_W - M - 100, PAGE_H - 38, { width: 100, align: 'right', lineBreak: false });
  }

  doc.end();
  return output;
}
