import { jsPDF } from 'jspdf';
import { fetchImages, bufferToDataUrl } from './img-fetch.util';

export interface PdfRow {
  brand: string;
  name: string;
  ml: number | null;
  imageUrl: string | null;
  sellPen: number;
}

// Paleta AromaStudio (RGB)
const DARK: [number, number, number] = [46, 16, 101];
const PURPLE: [number, number, number] = [109, 40, 217];
const GOLD: [number, number, number] = [201, 162, 39];
const GOLDTX: [number, number, number] = [166, 124, 0];
const CARD: [number, number, number] = [250, 249, 255];

/** PDF decorado (tipo catálogo): portada + tarjetas con foto grande y precio. */
export async function downloadResellerPdf(opts: {
  title: string;
  subtitle: string;
  filename: string;
  rows: PdfRow[];
  onProgress?: (done: number, total: number) => void;
}): Promise<void> {
  const imgs = await fetchImages(opts.rows.map(r => r.imageUrl), opts.onProgress, 260);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, margin = 12, gap = 8, headerH = 24;
  const cols = 2, rows = 3, perPage = cols * rows;
  const w = (PW - margin * 2 - gap) / cols;          // ~89
  const startY = headerH + 6;                         // 30
  const h = (PH - startY - 14 - gap * (rows - 1)) / rows; // ~79

  const header = () => {
    doc.setFillColor(...DARK);
    doc.rect(0, 0, PW, headerH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text(opts.title, margin, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(220, 210, 250);
    doc.text(opts.subtitle, margin, 19);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1.2);
    doc.line(0, headerH, PW, headerH);
  };

  const card = (x: number, y: number, row: PdfRow) => {
    doc.setFillColor(...CARD);
    doc.roundedRect(x, y, w, h, 3, 3, 'F');
    doc.setDrawColor(230, 225, 245);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, w, h, 3, 3, 'S');
    doc.setFillColor(...GOLD);
    doc.roundedRect(x, y, w, 2.4, 1, 1, 'F');

    const imgSize = 40, ix = x + (w - imgSize) / 2, iy = y + 7;
    const buf = row.imageUrl ? imgs.get(row.imageUrl) : null;
    if (buf) {
      try { doc.addImage(bufferToDataUrl(buf), 'JPEG', ix, iy, imgSize, imgSize); } catch { /* omite */ }
    } else {
      doc.setFillColor(238, 235, 248);
      doc.roundedRect(ix, iy, imgSize, imgSize, 2, 2, 'F');
      doc.setTextColor(180, 175, 200);
      doc.setFontSize(7);
      doc.text('sin foto', x + w / 2, iy + imgSize / 2, { align: 'center' });
    }

    doc.setTextColor(...GOLDTX);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text((row.brand || '').toUpperCase().slice(0, 28), x + w / 2, iy + imgSize + 7, { align: 'center' });

    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const nameLines = (doc.splitTextToSize(row.name || '', w - 8) as string[]).slice(0, 2);
    doc.text(nameLines, x + w / 2, iy + imgSize + 13, { align: 'center' });

    if (row.ml) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 145, 170);
      doc.text(`${row.ml} ml`, x + w / 2, iy + imgSize + 13 + (nameLines.length > 1 ? 6 : 0) + 5, { align: 'center' });
    }

    const pillW = 52, pillH = 10, px = x + (w - pillW) / 2, py = y + h - pillH - 4;
    doc.setFillColor(...PURPLE);
    doc.roundedRect(px, py, pillW, pillH, 5, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('S/ ' + row.sellPen, x + w / 2, py + pillH / 2 + 1.6, { align: 'center' });
  };

  for (let i = 0; i < opts.rows.length; i++) {
    const pos = i % perPage;
    if (pos === 0) { if (i > 0) doc.addPage(); header(); }
    const c = pos % cols, rr = Math.floor(pos / cols);
    card(margin + c * (w + gap), startY + rr * (h + gap), opts.rows[i]);
  }

  doc.save(opts.filename);
}
