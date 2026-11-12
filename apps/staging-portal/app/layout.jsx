import "./style.css";
import localFont from "next/font/local";
const inter = localFont({
  src: "./assets/InterVariable.woff2",
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Q/CUE Command Center · LaunchStudio Staging",
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <main>{children}</main>
      </body>
    </html>
  );
}
