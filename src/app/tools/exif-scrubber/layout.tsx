import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offline Photo EXIF Scrubber | Remove Metadata | FileOmni',
  description: 'Strip hidden GPS location and device data from your images before sharing. 100% browser-based metadata removal for absolute privacy.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
