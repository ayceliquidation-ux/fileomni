"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface WorkspaceContextType {
  file: File | null;
  setFile: (file: File | null) => void;
  clearFile: () => void;
  activeTool: string | null;
  setActiveTool: (tool: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const clearFile = () => {
    setFile(null);
    setActiveTool(null);
  };

  return (
    <WorkspaceContext.Provider value={{ file, setFile, clearFile, activeTool, setActiveTool }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
