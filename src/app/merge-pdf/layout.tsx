import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Merge PDFs Locally | Secure Document Combiner | FileOmni',
  description: 'Combine multiple PDF files into one securely. Processing happens entirely in your browser to guarantee your private data never leaves your computer.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
