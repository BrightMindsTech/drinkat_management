import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { SessionProvider } from '@/components/SessionProvider';
import { ModalScrollIntoViewListener } from '@/components/ModalScrollIntoViewListener';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'DrinkatHR',
  description: 'HR, QC & reports for DrinkatHR',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('locale')?.value as 'en' | 'ar') || 'en';
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className="overflow-x-hidden" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('drinkat-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');else document.documentElement.classList.add('light');})()`,
          }}
        />
      </head>
      <body className="min-h-screen w-full max-w-[100dvw] overflow-x-hidden bg-ios-gray dark:bg-ios-gray-dark text-app-primary antialiased transition-colors">
        <ThemeProvider>
          <LanguageProvider>
            <SessionProvider>
              <ModalScrollIntoViewListener />
              {children}
            </SessionProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
