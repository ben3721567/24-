import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Crypto Signal Monitor',
  description: 'AI-Powered Pine Script Crypto Signal System',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="zh-CN" className="bg-[#0b0e11]">
      <body className={`${inter.className} bg-[#0b0e11] text-[#eaecef] m-0 p-0 overflow-hidden h-screen`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
