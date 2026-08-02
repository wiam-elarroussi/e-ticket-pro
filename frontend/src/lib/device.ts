import { Monitor, Smartphone, Terminal, Globe, LucideIcon } from 'lucide-react';
import { TranslationKey } from '@/store/i18n-store';

export interface DeviceDisplay {
  label: string;
  icon: LucideIcon;
}

type T = (key: TranslationKey) => string;

/**
 * Traduit un User-Agent brut ou un contexte de canal en libellé lisible + icône.
 */
export function parseUserAgent(
  deviceInfo: string | { userAgent?: string | null; ua?: string | null } | null | undefined,
  salesChannel: { name: string; type: string } | null | undefined,
  t: T,
): DeviceDisplay {
  const ua = typeof deviceInfo === 'string' ? deviceInfo : deviceInfo?.userAgent || deviceInfo?.ua || '';

  if (ua) {
    if (/curl\//i.test(ua)) {
      return { label: `${t('device.api_request')} (${ua.split('/')[0]})`, icon: Terminal };
    }
    if (/postman/i.test(ua)) return { label: 'Postman (API)', icon: Terminal };
    if (/okhttp|axios|python-requests|node-fetch/i.test(ua)) return { label: 'Client API', icon: Terminal };

    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);

    if (isAndroid && /(zebra|honeywell|datalogic|scanner|pda)/i.test(ua)) {
      return { label: t('device.pda_android'), icon: Smartphone };
    }

    let os = '';
    if (/windows nt/i.test(ua)) os = 'Windows';
    else if (isAndroid) os = 'Android';
    else if (isIOS) os = 'iOS';
    else if (/mac os x/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    let browser = '';
    if (/edg\//i.test(ua)) browser = 'Edge';
    else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
    else if (/firefox\//i.test(ua)) browser = 'Firefox';
    else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';

    const icon = isAndroid || isIOS ? Smartphone : Monitor;

    if (browser && os) return { label: `${browser} ${t('device.browser_on_os')} ${os}`, icon };
    if (os) return { label: os, icon };
    if (browser) return { label: browser, icon };
  }

  // De secours intelligent basé sur le canal d'origine
  if (salesChannel) {
    if (salesChannel.type === 'LOCAL_POS' || salesChannel.type === 'REMOTE_POS') {
      return { label: `${t('device.pos_desk')} (${salesChannel.name})`, icon: Monitor };
    }
    if (salesChannel.type === 'PARTNER_API') {
      return { label: `${t('device.pda_scanner')} (${salesChannel.name})`, icon: Smartphone };
    }
    if (salesChannel.type === 'WEB') {
      return { label: `${t('device.web_browser')} (${salesChannel.name})`, icon: Globe };
    }
  }

  return { label: t('device.web_browser_user_session'), icon: Monitor };
}
