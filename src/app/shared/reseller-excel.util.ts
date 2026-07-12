import { Workbook } from 'exceljs';

/** Una fila de la lista de reventa: datos del perfume + precio de venta ya calculado (S/). */
export interface ResellerRow {
  brand: string;
  name: string;
  ml: number | null;
  imageUrl: string | null;
  sellPen: number;
}

// Paleta AromaStudio
const DARK = 'FF2E1065';    // morado oscuro (título)
const PURPLE = 'FF6D28D9';  // morado (header)
const GOLD = 'FFC9A227';    // dorado (acentos)
const LIGHT = 'FFF5F3FF';   // lila muy claro (subtítulo)
const ZEBRA = 'FFFAF9FF';   // filas alternas

/**
 * Genera y descarga un Excel bonito (colores, título, tabla, imágenes opcionales)
 * con la lista de perfumes y su precio de venta. Corre en el navegador.
 */
export async function downloadResellerExcel(opts: {
  title: string;
  subtitle: string;
  filename: string;
  rows: ResellerRow[];
  withImages?: boolean;
  onProgress?: (done: number, total: number) => void;
}): Promise<void> {
  const wb = new Workbook();
  const ws = wb.addWorksheet('Precios', { views: [{ state: 'frozen', ySplit: 3 }] });

  ws.columns = [
    { key: 'img', width: 11 },
    { key: 'brand', width: 22 },
    { key: 'name', width: 42 },
    { key: 'ml', width: 8 },
    { key: 'price', width: 16 },
  ];

  // Título (A1:E1)
  ws.mergeCells('A1:E1');
  const t = ws.getCell('A1');
  t.value = opts.title;
  t.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
  t.alignment = { vertical: 'middle', horizontal: 'center' };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
  ws.getRow(1).height = 36;

  // Subtítulo (A2:E2)
  ws.mergeCells('A2:E2');
  const st = ws.getCell('A2');
  st.value = opts.subtitle;
  st.font = { size: 11, italic: true, color: { argb: DARK } };
  st.alignment = { horizontal: 'center', vertical: 'middle' };
  st.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };
  ws.getRow(2).height = 22;

  // Header (fila 3)
  const header = ws.getRow(3);
  header.values = ['Foto', 'Marca', 'Perfume', 'ml', 'Precio venta (S/)'];
  header.height = 22;
  header.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = { bottom: { style: 'medium', color: { argb: GOLD } } };
  });

  let r = 4;
  const total = opts.rows.length;
  for (let i = 0; i < total; i++) {
    const row = opts.rows[i];
    const xr = ws.getRow(r);
    xr.getCell(2).value = row.brand;
    xr.getCell(3).value = row.name;
    xr.getCell(4).value = row.ml || '';
    xr.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    const priceCell = xr.getCell(5);
    priceCell.value = row.sellPen;
    priceCell.numFmt = '"S/ "#,##0';
    priceCell.font = { bold: true, color: { argb: DARK }, size: 12 };
    priceCell.alignment = { horizontal: 'right', vertical: 'middle' };
    xr.getCell(2).alignment = { vertical: 'middle' };
    xr.getCell(3).alignment = { vertical: 'middle', wrapText: true };
    if (r % 2 === 0) {
      for (let c = 1; c <= 5; c++) {
        xr.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
      }
    }
    xr.height = opts.withImages ? 54 : 20;

    if (opts.withImages && row.imageUrl) {
      const buf = await fetchImageBuffer(row.imageUrl);
      if (buf) {
        try {
          const imgId = wb.addImage({ buffer: buf as any, extension: 'jpeg' });
          ws.addImage(imgId, { tl: { col: 0.15, row: r - 1 + 0.08 }, ext: { width: 60, height: 60 } });
        } catch { /* ignora imágenes que no se pudieron incrustar */ }
      }
    }
    r++;
    opts.onProgress?.(i + 1, total);
  }

  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Descarga la imagen (vía proxy wsrv como JPG) para incrustarla. Best-effort. */
async function fetchImageBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    if (!/^https?:\/\//i.test(url)) return null;
    const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=128&h=128&fit=cover&output=jpg`;
    const res = await fetch(proxied);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}
