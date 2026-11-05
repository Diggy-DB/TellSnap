import './globals.css';
import type { ReactNode } from 'react';
import Header from '../src/components/Header';
import { Providers } from '../src/app/providers';

export const metadata = {
  title: 'StoryForge',
  description: 'Collaborative cinematic + anime storytelling.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
        <Providers>
          <Header />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
