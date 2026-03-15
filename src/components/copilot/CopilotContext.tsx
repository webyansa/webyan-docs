import React, { createContext, useContext, useState, useCallback } from 'react';

export interface CopilotPageContext {
  type?: 'ticket' | 'client' | 'project' | 'quote';
  id?: string;
  title?: string;
  description?: string;
  lastMessage?: string;
  stage?: string;
  clientName?: string;
}

interface CopilotContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  pageContext: CopilotPageContext;
  setPageContext: (ctx: CopilotPageContext) => void;
}

const CopilotCtx = createContext<CopilotContextType>({
  isOpen: false,
  setIsOpen: () => {},
  pageContext: {},
  setPageContext: () => {},
});

export const useCopilot = () => useContext(CopilotCtx);

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pageContext, setPageContext] = useState<CopilotPageContext>({});

  return (
    <CopilotCtx.Provider value={{ isOpen, setIsOpen, pageContext, setPageContext }}>
      {children}
    </CopilotCtx.Provider>
  );
}
