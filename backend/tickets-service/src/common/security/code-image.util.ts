import bwipjs from 'bwip-js';

export type CodeImageType = 'qrcode' | 'barcode';

/** Rendu QR/code-barres en PNG (bwip-js, pur JS — pas de dépendance native comme node-canvas). */
export async function renderCodeImage(value: string, type: CodeImageType): Promise<string> {
  const buffer = await bwipjs.toBuffer({
    bcid: type === 'qrcode' ? 'qrcode' : 'code128',
    text: value,
    scale: 3,
    includetext: type === 'barcode',
    textxalign: 'center',
  });
  return `data:image/png;base64,${buffer.toString('base64')}`;
}
