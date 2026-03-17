import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Flatten PDF | Secure Offline Form Locker | FileOmni',
  description: 'Make interactive PDF form fields permanent and uneditable. Flatten your documents securely in your browser with zero cloud uploads.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
