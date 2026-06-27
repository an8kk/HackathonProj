import React, {
  createContext, useContext, useState, useEffect, useCallback,
} from 'react';
import type { Investigation, InvestigationStatus, InvestigationNote } from 'shared/qamqor-data/types';

interface InvestigationsContextType {
  investigations: Investigation[];
  /** Открыть расследование по точке. */
  openInvestigation: (input: {
    locationId: string;
    locationName: string;
    assignee: string;
    reason: string;
    deficitAtOpen: number;
    note?: string;
  }) => void;
  setStatus: (id: string, status: InvestigationStatus) => void;
  addNote: (id: string, text: string, author?: string) => void;
  byLocation: (locationId: string) => Investigation | undefined;
  openCount: number;
}

const InvestigationsContext = createContext<InvestigationsContextType | null>(null);

const STORAGE_KEY = 'qamqor_investigations_v1';

function load(): Investigation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Investigation[];
  } catch {
    // ignore
  }
  return [];
}

export function InvestigationsProvider({ children }: { children: React.ReactNode }) {
  const [investigations, setInvestigations] = useState<Investigation[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(investigations));
  }, [investigations]);

  const openInvestigation = useCallback<InvestigationsContextType['openInvestigation']>((input) => {
    const now = new Date().toISOString();
    const notes: InvestigationNote[] = input.note
      ? [{ id: `note-${Date.now()}`, text: input.note, author: input.assignee, createdAt: now }]
      : [];
    const inv: Investigation = {
      id: `inv-${Date.now()}`,
      locationId: input.locationId,
      locationName: input.locationName,
      status: 'open',
      assignee: input.assignee,
      reason: input.reason,
      notes,
      openedAt: now,
      deficitAtOpen: input.deficitAtOpen,
    };
    // Одно активное расследование на точку: заменяем существующее.
    setInvestigations((prev) => [inv, ...prev.filter((i) => i.locationId !== input.locationId)]);
  }, []);

  const setStatus = useCallback((id: string, status: InvestigationStatus) => {
    setInvestigations((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  }, []);

  const addNote = useCallback((id: string, text: string, author = 'Владелец') => {
    setInvestigations((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              notes: [
                ...i.notes,
                { id: `note-${Date.now()}`, text, author, createdAt: new Date().toISOString() },
              ],
            }
          : i,
      ),
    );
  }, []);

  const byLocation = useCallback(
    (locationId: string) => investigations.find((i) => i.locationId === locationId),
    [investigations],
  );

  const openCount = investigations.filter((i) => i.status !== 'closed').length;

  return (
    <InvestigationsContext.Provider
      value={{ investigations, openInvestigation, setStatus, addNote, byLocation, openCount }}
    >
      {children}
    </InvestigationsContext.Provider>
  );
}

export function useInvestigations() {
  const ctx = useContext(InvestigationsContext);
  if (!ctx) throw new Error('useInvestigations must be used within InvestigationsProvider');
  return ctx;
}
