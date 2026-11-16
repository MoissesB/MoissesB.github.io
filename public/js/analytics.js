export const PRIMARY_HOSTNAME = 'thalia-innova.com';
export const MEASUREMENT_ID = 'G-Z1LR9K4MKV';

export function shouldEnableAnalytics(hostname) {
  return hostname === PRIMARY_HOSTNAME;
}

export function installAnalytics(windowRef = window, documentRef = document) {
  if (!shouldEnableAnalytics(windowRef.location.hostname)) return false;
  if (windowRef.__thaliaPrimaryGa4Installed) return true;

  windowRef.__thaliaPrimaryGa4Installed = true;
  windowRef.dataLayer = windowRef.dataLayer || [];
  windowRef.gtag = windowRef.gtag || function gtag() {
    windowRef.dataLayer.push(arguments);
  };
  windowRef.gtag('js', new Date());
  windowRef.gtag('config', MEASUREMENT_ID);

  const script = documentRef.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  script.dataset.thaliaPrimaryGa4 = MEASUREMENT_ID;
  documentRef.head.append(script);
  return true;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  installAnalytics();
}
