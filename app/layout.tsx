/// <reference types="@types/google.maps" />
// app/layout.tsx
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import ReferralTracker from '@/components/ReferralTracker';
import { Providers } from '@/components/providers';
import Navbar from '@/components/navbar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'GrowToGive',
  description: 'Community marketplace, directory, and giving platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Suspense fallback={null}>
            <ReferralTracker />
          </Suspense>

          <Navbar />

          <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
            {children}
          </div>
        </Providers>

        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          async
          defer
        />
      </body>
    </html>
  );
}