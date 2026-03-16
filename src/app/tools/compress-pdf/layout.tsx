import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Secure PDF Compressor | 100% Local & Offline | FileOmni',
  description: 'Shrink PDF file sizes instantly on your own device. No server uploads, no data tracking. The safest way to compress sensitive documents.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
