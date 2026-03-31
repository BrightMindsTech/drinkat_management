import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ios: {
          blue: '#007AFF',
          gray: '#F2F2F7',
          // iOS dark mode palette (Human Interface Guidelines)
          'gray-dark': '#1C1C1E',        // Grouped background (base)
          'dark-elevated': '#2C2C2E',    // Cards, list groups
          'dark-elevated-2': '#3A3A3C',  // Inputs, higher elevation
          'dark-fill': '#48484A',        // Control backgrounds
          'dark-separator': '#38383A',   // Borders, dividers
          'dark-label': '#FFFFFF',
          'dark-label-secondary': '#8E8E93',
          'dark-label-tertiary': '#636366',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'SF Pro Display', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'ios': '10px',
        'ios-lg': '12px',
      },
    },
  },
  plugins: [],
};
export default config;
