import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Private PDF Editor | Add Text & Edit Offline | FileOmni',
  description: 'Edit PDF documents, add text, and fill forms without uploading your sensitive files to the cloud. Fast, secure, and runs entirely on your machine.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
