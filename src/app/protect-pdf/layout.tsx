import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Password Protect PDF | Secure Offline Encryption | FileOmni',
  description: 'Lock your PDF files with strong encryption directly in your browser. No cloud servers means your passwords and files stay strictly yours.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
