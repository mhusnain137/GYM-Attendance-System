import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import './themes.css'
import './App.css'
import App from './App.jsx'
import { getApiBaseUrl } from './utils/apiConfig'

// Global fetch interceptor for remote cloud deployment (Vercel -> Backend Tunnel)
const originalFetch = window.fetch;
window.fetch = async function (input, init) {
  let url = input;
  if (typeof input === 'string') {
    if (input.startsWith('/api/') || input.startsWith('/video/')) {
      const baseUrl = getApiBaseUrl();
      if (baseUrl) {
        url = `${baseUrl}${input}`;
      }
    }
  } else if (input instanceof URL) {
    // URL instance
  } else if (input && typeof input.url === 'string') {
    if (input.url.startsWith('/api/') || input.url.startsWith('/video/')) {
      const baseUrl = getApiBaseUrl();
      if (baseUrl) {
        url = new Request(`${baseUrl}${input.url}`, input);
      }
    }
  }
  return originalFetch.call(this, url, init);
};

// Global Axios base URL
const initialBaseUrl = getApiBaseUrl();
if (initialBaseUrl) {
  axios.defaults.baseURL = initialBaseUrl;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
