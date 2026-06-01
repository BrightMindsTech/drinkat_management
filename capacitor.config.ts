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
  ios: {
    /**
     * Edge-to-edge webview so `env(safe-area-inset-*)` matches the device (Dynamic Island / notch).
     * `automatic` often makes CSS safe-area env vars unreliable in WKWebView.
     */
    contentInset: 'never',
    /**
     * Required when Info.plist lists WKAppBoundDomains — without this, Capacitor cannot inject
     * its native bridge and every plugin reports platform "web" (push/geolocation break).
     * @see https://github.com/ionic-team/capacitor/issues/4721
     */
    limitsNavigationsToAppBoundDomains: true,
    /** Makes Cloudflare diagnostics distinguish App Store shell vs Mobile Safari. */
    appendUserAgent: 'DrinkatHR-Native',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
