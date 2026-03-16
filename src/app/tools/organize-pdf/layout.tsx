import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Organize & Reorder PDF Pages | 100% Local | FileOmni',
  description: 'Visually drag, drop, and reorder PDF pages directly in your browser. Fast, secure, and no cloud uploads required.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
