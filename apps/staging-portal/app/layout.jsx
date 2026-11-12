import "./style.css";
import localFont from "next/font/local";
import { siteOrigin } from './marketing/content.mjs';
const inter = localFont({
  src: "./assets/InterVariable.woff2",
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "LaunchStudio · Build your business",
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        {children}
      </body>
    </html>
  );
}
