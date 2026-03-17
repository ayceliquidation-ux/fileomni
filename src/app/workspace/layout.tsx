import type { Metadata } from 'next';
import { WorkspaceProvider } from '@/context/WorkspaceContext';

export const metadata: Metadata = {
  title: 'Universal Workspace | FileOmni',
  description: 'Your central hub for local, secure file manipulation and processing. 100% offline.',
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      {children}
    </WorkspaceProvider>
  );
}
