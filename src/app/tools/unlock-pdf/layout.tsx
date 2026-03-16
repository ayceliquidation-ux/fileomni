import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Unlock PDF | Remove Passwords Locally | FileOmni',
  description: 'Remove PDF passwords and unlock documents securely in your browser. No cloud uploads, 100% offline processing.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
