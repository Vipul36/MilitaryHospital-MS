// Dynamic API & WebSocket configuration module for MHMS Frontend

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '');

export const getWsUrl = (): string => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  try {
    const url = new URL(API_BASE_URL);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${url.host}/ws`;
  } catch (err) {
    // Fallback if URL parsing fails
    return API_BASE_URL.replace(/^http/, 'ws') + '/ws';
  }
};
