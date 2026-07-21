'use strict';

const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');

/**
 * Adds a diagonal "My Portal UCP" watermark to every page of a PDF buffer.
 * If processing fails, returns the original buffer as a safe fallback.
 */
async function addWatermark(pdfBuffer) {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) return pdfBuffer;

  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const text = 'MY PORTAL UCP';

    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();
      const fontSize = Math.min(width, height) * 0.12;
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      // Center calculation with 35 degree rotation
      const x = (width - textWidth) / 2 + (textWidth / 6);
      const y = (height - textHeight) / 2;

      // Draw primary diagonal watermark text with 0.25 opacity
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.35, 0.35, 0.35),
        opacity: 0.25,
        rotate: degrees(35)
      });

      // Draw secondary repeat watermarks at top and bottom for full coverage
      page.drawText('MY PORTAL UCP — COURSE VAULT', {
        x: width * 0.15,
        y: height * 0.85,
        size: fontSize * 0.4,
        font,
        color: rgb(0.4, 0.4, 0.4),
        opacity: 0.22
      });

      page.drawText('MY PORTAL UCP — COURSE VAULT', {
        x: width * 0.15,
        y: height * 0.08,
        size: fontSize * 0.4,
        font,
        color: rgb(0.4, 0.4, 0.4),
        opacity: 0.22
      });
    }

    const watermarkedBytes = await pdfDoc.save();
    return Buffer.from(watermarkedBytes);
  } catch (err) {
    console.warn(`[PDF_WATERMARK] Failed to watermark PDF: ${err.message}. Serving original buffer.`);
    return pdfBuffer;
  }
}

module.exports = { addWatermark };
