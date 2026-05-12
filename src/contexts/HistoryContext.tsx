import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

export type HistoryToolType =
  | "serp" | "brief" | "content" | "seo"
  | "lsi" | "pagespeed" | "cluster" | "linking" | "keywords";

export interface HistoryEntry {
  id: string;
  type: HistoryToolType;
  preview: string;       // short text shown in list
  fullData: unknown;     // full result payload
  timestamp: number;
}

export const HISTORY_TOOL_LABELS: Record<HistoryToolType, string> = {
  serp: "Аналіз пошукової видачі",
  brief: "Технічне завдання",
  content: "Генерація контенту",
  seo: "SEO-перевірка",
  lsi: "LSI та TF-IDF аналіз",
  pagespeed: "Технічний SEO-аудит",
  cluster: "Кластеризація семантики",
  linking: "Розумна перелінковка",
  keywords: "Дослідження ключових слів",
};

export const HISTORY_TOOL_COLORS: Record<HistoryToolType, string> = {
  serp: "text-blue-500 bg-blue-500/10 border-blue-500/30",
  brief: "text-primary bg-primary/10 border-primary/30",
  content: "text-purple-500 bg-purple-500/10 border-purple-500/30",
  seo: "text-orange-500 bg-orange-500/10 border-orange-500/30",
  lsi: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30",
  pagespeed: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  cluster: "text-violet-500 bg-violet-500/10 border-violet-500/30",
  linking: "text-rose-500 bg-rose-500/10 border-rose-500/30",
  keywords: "text-pink-500 bg-pink-500/10 border-pink-500/30",
};

const MAX_ENTRIES = 50;

function storageKey(username: string) {
  return `cf_history_${username}`;
}

// ── Context ───────────────────────────────────────────────────────────────────

interface HistoryContextType {
  entries: HistoryEntry[];
  addEntry: (type: HistoryToolType, preview: string, fullData: unknown) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextType | null>(null);

export const HistoryProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();

  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  // Reload from localStorage whenever the logged-in user changes
  useEffect(() => {
    if (!currentUser) {
      setEntries([]);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(currentUser.username));
      setEntries(raw ? (JSON.parse(raw) as HistoryEntry[]) : []);
    } catch {
      setEntries([]);
    }
  }, [currentUser?.username]);

  const persist = useCallback(
    (items: HistoryEntry[]) => {
      if (!currentUser) return;
      localStorage.setItem(storageKey(currentUser.username), JSON.stringify(items));
    },
    [currentUser],
  );

  const addEntry = useCallback(
    (type: HistoryToolType, preview: string, fullData: unknown) => {
      if (!currentUser) return;
      const entry: HistoryEntry = {
        id: Math.random().toString(36).slice(2, 10),
        type,
        preview,
        fullData,
        timestamp: Date.now(),
      };
      setEntries((prev) => {
        const updated = [entry, ...prev].slice(0, MAX_ENTRIES);
        persist(updated);
        return updated;
      });
    },
    [currentUser, persist],
  );

  const removeEntry = useCallback(
    (id: string) => {
      setEntries((prev) => {
        const updated = prev.filter((e) => e.id !== id);
        persist(updated);
        return updated;
      });
    },
    [persist],
  );

  const clearHistory = useCallback(() => {
    setEntries([]);
    if (currentUser) localStorage.removeItem(storageKey(currentUser.username));
  }, [currentUser]);

  return (
    <HistoryContext.Provider value={{ entries, addEntry, removeEntry, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within HistoryProvider");
  return ctx;
};
