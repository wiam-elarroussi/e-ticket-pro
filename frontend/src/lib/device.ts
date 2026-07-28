import { Monitor, Smartphone, Terminal, Globe, LucideIcon } from 'lucide-react';

export interface DeviceDisplay {
  label: string;
  icon: LucideIcon;
}

/**
 * Traduit un User-Agent brut en libellé lisible + icône, pour l'affichage
 * dans la page Sessions (l'utilisateur ne devrait jamais voir une chaîne
 * technique du type "Mozilla/5.0 (Windows NT 10.0...)").
 */
export function parseUserAgent(ua?: string | null): DeviceDisplay {
  if (!ua) return { label: 'Appareil inconnu', icon: Globe };

  if (/curl\//i.test(ua)) {
    return { label: `Requête API (${ua.split('/')[0]})`, icon: Terminal };
  }
  if (/postman/i.test(ua)) return { label: 'Postman (API)', icon: Terminal };
  if (/okhttp|axios|python-requests|node-fetch/i.test(ua)) return { label: 'Client API', icon: Terminal };

  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);

  if (isAndroid && /(zebra|honeywell|datalogic|scanner|pda)/i.test(ua)) {
    return { label: 'PDA Android / Scannette', icon: Smartphone };
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

  if (browser && os) return { label: `${browser} sur ${os}`, icon };
  if (os) return { label: os, icon };
  if (browser) return { label: browser, icon };

  return { label: 'Appareil inconnu', icon: Globe };
}
