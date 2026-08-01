import { TemplateElement, TicketTemplate } from '@/lib/template-types';

function resolvePath(data: Record<string, unknown>, path: string): string {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
  return value === undefined || value === null ? '' : String(value);
}

interface TicketPreviewProps {
  template: Pick<TicketTemplate, 'width' | 'height' | 'backgroundColor' | 'elements'>;
  dataSnapshot: Record<string, unknown>;
  qrDataUrl?: string;
  barcodeDataUrl?: string;
}

/** Rendu "figé" (HTML absolument positionné) — reflète ce qui sera réellement imprimé, données injectées et QR/code-barres réels inclus. */
export function TicketPreview({ template, dataSnapshot, qrDataUrl, barcodeDataUrl }: TicketPreviewProps) {
  const renderElement = (el: TemplateElement) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
    };

    if (el.type === 'text') {
      const text = el.binding ? resolvePath(dataSnapshot, el.binding) || `{{${el.binding}}}` : el.staticText ?? '';
      return (
        <div
          key={el.id}
          style={{
            ...style,
            fontSize: el.fontSize ?? 14,
            color: el.color ?? '#000000',
            fontWeight: el.fontWeight === 'bold' ? 700 : 400,
            textAlign: el.align ?? 'left',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {text}
        </div>
      );
    }

    if (el.type === 'image') {
      return el.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={el.id} src={el.imageUrl} alt="" style={{ ...style, objectFit: 'contain' }} />
      ) : (
        <div key={el.id} style={{ ...style, background: '#f1f5f9' }} />
      );
    }

    const codeSrc = el.type === 'qrcode' ? qrDataUrl : barcodeDataUrl;
    return codeSrc ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img key={el.id} src={codeSrc} alt="" style={{ ...style, objectFit: 'contain' }} />
    ) : (
      <div key={el.id} style={{ ...style, background: '#f1f5f9' }} />
    );
  };

  return (
    <div
      style={{
        position: 'relative',
        width: template.width,
        height: template.height,
        backgroundColor: template.backgroundColor,
        overflow: 'hidden',
      }}
      className="ring-1 ring-slate-300 dark:ring-slate-600"
    >
      {template.elements.map(renderElement)}
    </div>
  );
}
