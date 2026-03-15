import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compress Office Files | FileOmni',
  description: 'Drastically reduce the file size of your Microsoft Word (.docx), PowerPoint (.pptx), and Excel (.xlsx) documents by compressing their internal media entirely locally.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
