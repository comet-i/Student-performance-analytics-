import { Inter, Lora } from "next/font/google";
import Providers from "@/lib/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });

export const metadata = {
  title: "EduTrack · Student Hub",
  description: "Cloud-based student performance and prediction analytics",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
