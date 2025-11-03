import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Daxon VRM Body Control Test',
  description: 'Real-time AI-controlled VRM avatar with generative motion',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
