const DEFAULT_PUBLIC_URL = 'https://www.tryweeve.com';

const isHttpOrigin = (origin: string | null | undefined) => {
  if (!origin) return false;
  return origin.startsWith('http://') || origin.startsWith('https://');
};

const isLocalLike = (value: string | null | undefined) => {
  if (!value) return true;

  if (/localhost/i.test(value)) return true;
  if (/127\.0\.0\.1/.test(value)) return true;
  if (/0\.0\.0\.0/.test(value)) return true;

  if (!isHttpOrigin(value)) {
    return true;
  }

  try {
    const { hostname } = new URL(value);

    if (!hostname) {
      return true;
    }

    if (hostname === 'localhost') return true;
    if (hostname === '0.0.0.0') return true;
    if (hostname === '127.0.0.1') return true;
    if (/^10\./.test(hostname)) return true;
    if (/^192\.168\./.test(hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
    if (/\.local$/i.test(hostname)) return true;

    return false;
  } catch {
    return true;
  }
};

export const getPublicBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_WEB_APP_URL?.trim();
  const prodEnvUrl = process.env.NEXT_PUBLIC_WEB_APP_URL_PROD?.trim();

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (isHttpOrigin(origin) && !isLocalLike(origin)) {
      return origin;
    }
  }

  if (envUrl && isHttpOrigin(envUrl) && !isLocalLike(envUrl)) {
    return envUrl.replace(/\/$/, '');
  }

  if (prodEnvUrl && isHttpOrigin(prodEnvUrl) && !isLocalLike(prodEnvUrl)) {
    return prodEnvUrl.replace(/\/$/, '');
  }

  return DEFAULT_PUBLIC_URL;
};

export const buildPublicUrl = (path: string) => {
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getPublicBaseUrl()}${trimmedPath}`;
};
