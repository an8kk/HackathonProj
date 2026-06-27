import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { WriteOffRequest } from 'shared/qamqor-data/types';
import { SEEDED_REQUESTS } from 'shared/qamqor-data/seed';

interface AppContextType {
  requests: WriteOffRequest[];
  addRequest: (req: WriteOffRequest) => void;
  approveRequest: (id: string) => void;
  rejectRequest: (id: string, reason: string) => void;
  pendingCount: number;
  approvedTodayCount: number;
  flaggedCount: number;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'qamqor_requests_v1';

function loadFromStorage(): WriteOffRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WriteOffRequest[];
      const seededIds = new Set(SEEDED_REQUESTS.map(r => r.id));
      const userAdded = parsed.filter(r => !seededIds.has(r.id));
      const seededWithStatus = SEEDED_REQUESTS.map(seed => {
        const stored = parsed.find(r => r.id === seed.id);
        return stored ?? seed;
      });
      return [...seededWithStatus, ...userAdded];
    }
  } catch {
    // ignore
  }
  return [...SEEDED_REQUESTS];
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<WriteOffRequest[]>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }, [requests]);

  const addRequest = useCallback((req: WriteOffRequest) => {
    setRequests(prev => [req, ...prev]);
  }, []);

  const approveRequest = useCallback((id: string) => {
    setRequests(prev =>
      prev.map(r => r.id === id ? { ...r, status: 'approved' } : r)
    );
  }, []);

  const rejectRequest = useCallback((id: string, reason: string) => {
    setRequests(prev =>
      prev.map(r => r.id === id ? { ...r, status: 'rejected', rejectionReason: reason } : r)
    );
  }, []);

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedTodayCount = requests.filter(r => r.status === 'approved').length;
  const flaggedCount = requests.filter(r => r.status === 'pending' && r.flags.length > 0).length;

  return (
    <AppContext.Provider value={{
      requests,
      addRequest,
      approveRequest,
      rejectRequest,
      pendingCount,
      approvedTodayCount,
      flaggedCount,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
