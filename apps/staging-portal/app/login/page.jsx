import Portal from '../customer-portal';
export const metadata = { title: 'Sign in · LaunchStudio', robots: { index: false, follow: false } };
export default function Login() { return <main className="customer-login"><Portal loginOnly /></main>; }
