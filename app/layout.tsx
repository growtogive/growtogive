import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import Navbar from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GrowToGive",
  description: "Directory & Marketplace for Church Members & Friends",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="w-full h-full">
      <body className={`${inter.className} w-full min-h-screen bg-white text-slate-900 overflow-x-hidden`}>
        <Providers>
          <Navbar />
          {/* Fluid full-width container with responsive padding and overflow safeguards */}
          <main className="w-full max-w-full px-[5px] sm:px-[30px] pb-12 overflow-x-hidden">
            {children}
          </main>
        </Providers>

        {/* Google Maps Places API Script */}
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          async
          defer
        ></script>
      </body>
    </html>
  );
}