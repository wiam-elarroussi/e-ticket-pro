import { SalesChannelType } from './types';

export const salesChannelTypeLabels: Record<SalesChannelType, string> = {
  LOCAL_POS: 'Guichet local',
  REMOTE_POS: 'Guichet distant',
  WEB: 'Site web',
  PARTNER_API: 'API partenaire',
};
