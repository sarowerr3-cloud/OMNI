import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SourceIQ - Product Sourcing & Costing Engine',
  description: 'Multi-platform sourcing and landed-cost calculation powered by Gemini AI.',
  manifest: '/manifest.json',
  themeColor: '#0284c7',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
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
