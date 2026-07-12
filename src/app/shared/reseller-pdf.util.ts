import { jsPDF } from 'jspdf';
import { fetchImages, bufferToDataUrl } from './img-fetch.util';

export interface PdfRow {
  brand: string;
  name: string;
  ml: number | null;
  imageUrl: string | null;
  sellPen: number;
}

// Paleta corporativa (neutra, sobria)
const INK: [number, number, number] = [30, 32, 38];
const GRAY: [number, number, number] = [128, 132, 140];
const LINE: [number, number, number] = [226, 229, 233];
const SOFT: [number, number, number] = [247, 248, 250];
const ACCENT: [number, number, number] = [176, 141, 54]; // dorado apagado, solo como fino acento

/** PDF de catálogo con estilo empresarial: encabezado limpio + tarjetas ordenadas. */
export async function downloadResellerPdf(opts: {
  title: string;
  subtitle: string;
  filename: string;
  rows: PdfRow[];
  onProgress?: (done: number, total: number) => void;
}): Promise<void> {
  const imgs = await fetchImages(opts.rows.map(r => r.imageUrl), opts.onProgress, 260);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, margin = 14, gap = 8, headerH = 26;
  const cols = 2, rows = 3, perPage = cols * rows;
  const w = (PW - margin * 2 - gap) / cols;              // ~87
  const startY = headerH + 6;                            // 32
  const h = (PH - startY - 16 - gap * (rows - 1)) / rows; // ~77

  let pageNo = 0;
  const totalPages = Math.max(1, Math.ceil(opts.rows.length / perPage));

  const header = () => {
    pageNo++;
    // fino acento superior
    doc.setFillColor(...ACCENT);
    doc.rect(0, 0, PW, 2, 'F');
    // título + subtítulo
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(opts.title, margin, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY);
    doc.text(opts.subtitle, margin, 21);
    // regla inferior
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.4);
    doc.line(margin, headerH, PW - margin, headerH);
    // pie: número de página
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`Página ${pageNo} de ${totalPages}`, PW - margin, PH - 8, { align: 'right' });
  };

  const card = (x: number, y: number, row: PdfRow) => {
    // tarjeta limpia con borde fino
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 2, 2, 'FD');

    // imagen
    const imgSize = 40, ix = x + (w - imgSize) / 2, iy = y + 5;
    const buf = row.imageUrl ? imgs.get(row.imageUrl) : null;
    if (buf) {
      try { doc.addImage(bufferToDataUrl(buf), 'JPEG', ix, iy, imgSize, imgSize); } catch { /* omite */ }
    } else {
      doc.setFillColor(...SOFT);
      doc.roundedRect(ix, iy, imgSize, imgSize, 2, 2, 'F');
      doc.setTextColor(190, 193, 198);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('sin foto', x + w / 2, iy + imgSize / 2, { align: 'center' });
    }

    // separador
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(x + 6, y + 47, x + w - 6, y + 47);

    // marca · ml (secundario, en mayúsculas)
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const brandLine = (row.brand || '').toUpperCase() + (row.ml ? `   ·   ${row.ml} ML` : '');
    doc.text(brandLine.slice(0, 42), x + 6, y + 52);

    // nombre (máx 2 líneas)
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    const nameLines = (doc.splitTextToSize(row.name || '', w - 12) as string[]).slice(0, 2);
    doc.text(nameLines, x + 6, y + 57);

    // fila de precio: etiqueta a la izq, precio a la der (sin caja llamativa)
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(x + 6, y + h - 13, x + w - 6, y + h - 13);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Precio de venta', x + 6, y + h - 5.5);
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('S/ ' + row.sellPen, x + w - 6, y + h - 5, { align: 'right' });
  };

  for (let i = 0; i < opts.rows.length; i++) {
    const pos = i % perPage;
    if (pos === 0) { if (i > 0) doc.addPage(); header(); }
    const c = pos % cols, rr = Math.floor(pos / cols);
    card(margin + c * (w + gap), startY + rr * (h + gap), opts.rows[i]);
  }

  doc.save(opts.filename);
}
