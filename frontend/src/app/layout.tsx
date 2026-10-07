import './globals.css';
import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'OMNI - Global Sourcing & BD Market Intelligence Engine',
  description: 'Product sourcing from AliExpress, 1688, Pinduoduo, landed-cost calculator, and Bangladesh market price discovery powered by Google Gemini AI.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
