import { SalesChannelType } from './types';
import { TranslationKey } from '@/store/i18n-store';

export function getSalesChannelTypeLabels(t: (key: TranslationKey) => string): Record<SalesChannelType, string> {
  return {
    LOCAL_POS: t('salesChannels.type.local_pos'),
    REMOTE_POS: t('salesChannels.type.remote_pos'),
    WEB: t('salesChannels.type.web'),
    PARTNER_API: t('salesChannels.type.partner_api'),
  };
}
