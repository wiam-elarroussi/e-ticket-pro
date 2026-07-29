import { Injectable } from '@nestjs/common';
import { ServicesClient } from '../../integrations/services-client';
import { Column, formatCsv, formatXml } from './format.util';
import { buildXlsxBuffer } from './xlsx.util';
import { buildPdfBuffer } from './pdf.util';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'xml';

export interface ExportResult {
  contentType: string;
  filename: string;
  body: string | Buffer;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

@Injectable()
export class ExportsService {
  constructor(private readonly services: ServicesClient) {}

  async exportOrders(token: string, eventId: string | undefined, format: ExportFormat): Promise<ExportResult> {
    const [ordersRes, channelsRes] = await Promise.all([
      this.services.listOrders(token, eventId),
      this.services.listSalesChannels(token),
    ]);
    const channels = channelsRes.data ?? [];
    const rows = (ordersRes.data ?? []).map((o) => ({
      id: o.id,
      date: dateFmt.format(new Date(o.createdAt)),
      canal: channels.find((c) => c.id === o.channelId)?.name ?? 'Inconnu',
      paiement: o.paymentMethod,
      statut: o.status,
      montant: Number(o.totalAmount).toFixed(2),
      billets: o.items.length,
      acheteur: o.buyerName ?? '',
      email: o.buyerEmail ?? '',
      telephone: o.buyerPhone ?? '',
    }));
    const columns: Column[] = [
      { key: 'id', label: 'ID' },
      { key: 'date', label: 'Date' },
      { key: 'canal', label: 'Canal' },
      { key: 'paiement', label: 'Paiement' },
      { key: 'statut', label: 'Statut' },
      { key: 'montant', label: 'Montant (MAD)' },
      { key: 'billets', label: 'Billets' },
      { key: 'acheteur', label: 'Acheteur' },
      { key: 'email', label: 'Email' },
      { key: 'telephone', label: 'Téléphone' },
    ];
    return this.render('ventes', 'Historique des ventes', columns, rows, format);
  }

  async exportAccessLogs(token: string, eventId: string, format: ExportFormat): Promise<ExportResult> {
    const logsRes = await this.services.listAccessLogs(token, eventId);
    const rows = (logsRes.data ?? []).map((l) => ({
      date: dateFmt.format(new Date(l.scannedAt)),
      type: l.scanType === 'TICKET' ? 'Billet' : 'Abonnement',
      resultat: l.result,
      porte: l.gateId,
    }));
    const columns: Column[] = [
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'resultat', label: 'Résultat' },
      { key: 'porte', label: 'Porte (ID)' },
    ];
    return this.render('controle-acces', "Journal de contrôle d'accès", columns, rows, format);
  }

  /** Export CRM (module 7.3) : contacts distincts (acheteurs + abonnés) pour campagnes marketing.
   * Permission distincte (reports:export-crm) car il s'agit de données personnelles exploitables
   * à des fins commerciales, contrairement à la simple consultation de rapports (reports:read). */
  async exportCrmContacts(token: string, eventId: string | undefined, format: 'csv' | 'xlsx'): Promise<ExportResult> {
    const [ordersRes, subsRes] = await Promise.all([
      this.services.listOrders(token, eventId),
      this.services.listSubscriptions(token),
    ]);

    const contacts = new Map<string, { nom: string; email: string; telephone: string; source: string }>();
    for (const o of ordersRes.data ?? []) {
      if (!o.buyerEmail) continue;
      const key = o.buyerEmail.toLowerCase();
      if (!contacts.has(key)) {
        contacts.set(key, {
          nom: o.buyerName ?? '',
          email: o.buyerEmail,
          telephone: o.buyerPhone ?? '',
          source: 'Achat guichet',
        });
      }
    }
    for (const s of subsRes.data ?? []) {
      if (!s.holderEmail) continue;
      const key = s.holderEmail.toLowerCase();
      if (!contacts.has(key)) {
        contacts.set(key, { nom: s.holderName, email: s.holderEmail, telephone: s.holderPhone ?? '', source: 'Abonnement' });
      }
    }

    const rows = Array.from(contacts.values());
    const columns: Column[] = [
      { key: 'nom', label: 'Nom' },
      { key: 'email', label: 'Email' },
      { key: 'telephone', label: 'Téléphone' },
      { key: 'source', label: 'Source' },
    ];
    return this.render('contacts-crm', 'Export contacts CRM', columns, rows, format);
  }

  private async render(
    baseName: string,
    title: string,
    columns: Column[],
    rows: Array<Record<string, unknown>>,
    format: ExportFormat,
  ): Promise<ExportResult> {
    switch (format) {
      case 'csv':
        return { contentType: 'text/csv; charset=utf-8', filename: `${baseName}.csv`, body: formatCsv(columns, rows) };
      case 'xml':
        return {
          contentType: 'application/xml; charset=utf-8',
          filename: `${baseName}.xml`,
          body: formatXml(baseName, 'item', columns, rows),
        };
      case 'xlsx':
        return {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: `${baseName}.xlsx`,
          body: await buildXlsxBuffer(title, columns, rows),
        };
      case 'pdf':
        return {
          contentType: 'application/pdf',
          filename: `${baseName}.pdf`,
          body: await buildPdfBuffer(title, columns, rows),
        };
    }
  }
}
