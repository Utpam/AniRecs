/**
 * Centralized Axios instance for AniRecs.
 *
 * All API requests should import and use `api` from this file instead
 * of calling `axios` directly. This ensures:
 *  - The correct base URL is used in every environment (dev / prod)
 *  - Credentials (cookies) are always sent for cross-origin requests
 *  - A single place to add interceptors or auth headers in the future
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL,
  withCredentials: true,           // required for cookie-based auth cross-origin
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
