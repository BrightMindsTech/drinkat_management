import type { CapacitorConfig } from '@capacitor/cli';

/**
 * iOS shell loads your **deployed** Next.js app (Cloudflare Worker URL).
 * Set `server.url` to the same origin users open in Safari (https, no trailing slash).
 */
const config: CapacitorConfig = {
  appId: 'com.bmtechs.drinkat',
  appName: 'DrinkatHR',
  webDir: 'www',
  server: {
    url: 'https://drinkat-management.technologiesbrightminds.workers.dev',
    cleartext: false,
  },
};

export default config;
