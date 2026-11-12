import './style.css';

export const metadata = { title: 'Q/CUE Command Center · LaunchStudio Staging', robots: { index: false, follow: false } };

export default function Layout({ children }) {
  return <html lang="en"><body><main>{children}</main></body></html>;
}
