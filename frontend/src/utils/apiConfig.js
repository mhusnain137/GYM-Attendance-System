// Centralized API and Live Stream URL resolver

export const getApiBaseUrl = () => {
  // 1. Check if user configured custom URL in localStorage (e.g., from Settings or Connection prompt)
  const savedUrl = localStorage.getItem('gym_backend_url');
  if (savedUrl && savedUrl.trim()) {
    return savedUrl.trim().replace(/\/+$/, '');
  }

  // 2. Check Vite environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }

  // 3. If running locally, empty string uses the Vite proxy
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '';
  }

  // 4. Fallback relative on production
  return '';
};

export const setApiBaseUrl = (url) => {
  if (!url) {
    localStorage.removeItem('gym_backend_url');
  } else {
    localStorage.setItem('gym_backend_url', url.trim().replace(/\/+$/, ''));
  }
};

export const getFullApiUrl = (endpoint) => {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!base) return cleanEndpoint;
  return `${base}${cleanEndpoint}`;
};
