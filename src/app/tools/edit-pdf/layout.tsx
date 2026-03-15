import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit PDF | FileOmni',
  description: 'Locally add text overlays and freehand drawings directly onto your PDF documents.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
