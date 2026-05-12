import { createContext, useContext, useState, useCallback, ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SerpPage {
  url: string;
  title: string;
  position: number;
  wordCount: number;
  imageCount: number;
  h1: string[];
  h2: string[];
  h3: string[];
  headings?: { tag: string; text: string }[];
}

export interface SerpStats {
  avgWords: number;
  avgH2: number;
  avgH3: number;
  avgImages: number;
  successfulScrapes: number;
  totalResults: number;
}

export interface SerpResult {
  keyword: string;
  region: string;
  pages: SerpPage[];
  scrapedTable: string;
  headingsDetail: string;
  aiAnalysis: string;
  stats: SerpStats | null;
  timestamp: number;
}

// LSI
export interface LsiWord {
  word: string;
  totalFreq: number;
  docFreq: number;
  recommended: number;
}
export interface LsiResult {
  keyword: string;
  words: LsiWord[];
  pagesAnalyzed: number;
  timestamp: number;
}

// PageSpeed
export interface PageSpeedScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}
export interface PageSpeedIssue {
  id: string;
  type: "error" | "warning";
  title: string;
  description: string;
  displayValue: string;
  score: number;
}
export interface PageSpeedResult {
  url: string;
  scores: PageSpeedScores;
  issues: PageSpeedIssue[];
  timestamp: number;
}

// Semantic Cluster
export interface SemanticCluster {
  mainKeyword: string;
  keywords: string[];
  commonUrls: string[];
}
export interface ClusterResult {
  clusters: SemanticCluster[];
  unclustered: string[];
  total: number;
  timestamp: number;
}

// Keywords Research
export interface KeywordItem {
  keyword: string;
  volume: number;
  cpc: number;
  difficulty: number;
  competition: number;
  bid_recommendation: string;
  ad_type: string;
  seo_priority: string;
}
export interface KeywordsCluster {
  name: string;
  intent: "Комерційний" | "Інформаційний" | "Навігаційний" | "Локальний";
  keywords: KeywordItem[];
  total_volume: number;
  avg_cpc: number;
  avg_difficulty: number;
  priority_score: number;
}
export interface KeywordsResult {
  seed: string;
  region: string;
  clusters: KeywordsCluster[];
  total_keywords: number;
  timestamp: number;
}

// Smart Linking
export interface LinkingSuggestion {
  location: string;
  anchor: string;
  targetUrl: string;
  targetTitle: string;
  reason: string;
}
export interface LinkingResult {
  suggestions: LinkingSuggestion[];
  timestamp: number;
}

// ── Context interface ─────────────────────────────────────────────────────────

interface AppStateContextType {
  serpResult: SerpResult | null;
  briefResult: string | null;
  contentResult: string | null;
  seoResult: string | null;
  lsiResult: LsiResult | null;
  pagespeedResult: PageSpeedResult | null;
  clusterResult: ClusterResult | null;
  linkingResult: LinkingResult | null;
  keywordsResult: KeywordsResult | null;
  setSerpResult: (v: SerpResult | null) => void;
  setBriefResult: (v: string | null) => void;
  setContentResult: (v: string | null) => void;
  setSeoResult: (v: string | null) => void;
  setLsiResult: (v: LsiResult | null) => void;
  setPagespeedResult: (v: PageSpeedResult | null) => void;
  setClusterResult: (v: ClusterResult | null) => void;
  setLinkingResult: (v: LinkingResult | null) => void;
  setKeywordsResult: (v: KeywordsResult | null) => void;
  clearAll: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("localStorage write failed:", e);
  }
}

const KEYS = {
  serp: "cf_serp_v2",
  brief: "cf_brief_v2",
  content: "cf_content_v2",
  seo: "cf_seo_v2",
  lsi: "cf_lsi_v1",
  pagespeed: "cf_pagespeed_v1",
  cluster: "cf_cluster_v1",
  linking: "cf_linking_v1",
  keywords: "cf_keywords_v1",
} as const;

// ── Context ───────────────────────────────────────────────────────────────────

const AppStateContext = createContext<AppStateContextType | null>(null);

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [serpResult, setSerpState] = useState<SerpResult | null>(() => load(KEYS.serp, null));
  const [briefResult, setBriefState] = useState<string | null>(() => load(KEYS.brief, null));
  const [contentResult, setContentState] = useState<string | null>(() => load(KEYS.content, null));
  const [seoResult, setSeoState] = useState<string | null>(() => load(KEYS.seo, null));
  const [lsiResult, setLsiState] = useState<LsiResult | null>(() => load(KEYS.lsi, null));
  const [pagespeedResult, setPagespeedState] = useState<PageSpeedResult | null>(() => load(KEYS.pagespeed, null));
  const [clusterResult, setClusterState] = useState<ClusterResult | null>(() => load(KEYS.cluster, null));
  const [linkingResult, setLinkingState] = useState<LinkingResult | null>(() => load(KEYS.linking, null));
  const [keywordsResult, setKeywordsState] = useState<KeywordsResult | null>(() => load(KEYS.keywords, null));

  const setSerpResult = useCallback((v: SerpResult | null) => { save(KEYS.serp, v); setSerpState(v); }, []);
  const setBriefResult = useCallback((v: string | null) => { save(KEYS.brief, v); setBriefState(v); }, []);
  const setContentResult = useCallback((v: string | null) => { save(KEYS.content, v); setContentState(v); }, []);
  const setSeoResult = useCallback((v: string | null) => { save(KEYS.seo, v); setSeoState(v); }, []);
  const setLsiResult = useCallback((v: LsiResult | null) => { save(KEYS.lsi, v); setLsiState(v); }, []);
  const setPagespeedResult = useCallback((v: PageSpeedResult | null) => { save(KEYS.pagespeed, v); setPagespeedState(v); }, []);
  const setClusterResult = useCallback((v: ClusterResult | null) => { save(KEYS.cluster, v); setClusterState(v); }, []);
  const setLinkingResult = useCallback((v: LinkingResult | null) => { save(KEYS.linking, v); setLinkingState(v); }, []);
  const setKeywordsResult = useCallback((v: KeywordsResult | null) => { save(KEYS.keywords, v); setKeywordsState(v); }, []);

  const clearAll = useCallback(() => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    setSerpState(null); setBriefState(null); setContentState(null); setSeoState(null);
    setLsiState(null); setPagespeedState(null); setClusterState(null); setLinkingState(null);
    setKeywordsState(null);
  }, []);

  return (
    <AppStateContext.Provider value={{
      serpResult, briefResult, contentResult, seoResult,
      lsiResult, pagespeedResult, clusterResult, linkingResult, keywordsResult,
      setSerpResult, setBriefResult, setContentResult, setSeoResult,
      setLsiResult, setPagespeedResult, setClusterResult, setLinkingResult, setKeywordsResult,
      clearAll,
    }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
};
