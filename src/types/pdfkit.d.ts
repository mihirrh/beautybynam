// PDFKit 0.20 added browser-friendly subpath exports that @types/pdfkit (0.17) does not describe yet.
declare module 'pdfkit/output' {
  export function toBlob(doc: PDFKit.PDFDocument): Promise<Blob>;
  export function toBytes(doc: PDFKit.PDFDocument): Promise<Uint8Array>;
}

declare module 'pdfkit/standard-fonts/Helvetica' {
  const font: unknown;
  export default font;
}
