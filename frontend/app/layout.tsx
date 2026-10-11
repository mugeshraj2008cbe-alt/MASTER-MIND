import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'MASTER MIND PHOTOGRAPHY — AI Reference-Based Photo Studio',
  description: 'AI-powered reference-based photo editing studio featuring Lightroom-inspired masking, cinematic color transfer, and 3 distinct variants.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#070709] text-[#f0f0f4] min-h-screen antialiased selection:bg-[#d4af37]/30 selection:text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
