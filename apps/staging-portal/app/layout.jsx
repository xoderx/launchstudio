import './style.css';

export const metadata = { title: 'LaunchStudio Staging', robots: { index: false, follow: false } };

export default function Layout({ children }) {
  return <html lang="en"><body><main>{children}</main></body></html>;
}
