import { apiFetch } from "@/contexts/AuthContext";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, CheckCircle2, XCircle,
  Brain, ShieldCheck, ChevronDown, ChevronUp, Wand2,
  ExternalLink, RefreshCw, StopCircle,
} from "lucide-react";
import { toast } from "sonner";

// ── Stop words ────────────────────────────────────────────────────────────────
const WATER = new Set([
  "та","і","й","або","але","що","як","це","він","вона","вони","ми","ви","я",
  "не","до","в","на","з","за","від","по","про","для","при","через","між",
  "ще","вже","якщо","коли","який","яка","яке","які","де","там","тут",
  "може","буде","був","була","було","є","цей","ця","ці","той","ті",
  "також","тому","тільки","навіть","його","її","їх","наш","ваш","свій",
  "всі","всіх","всього","кожен","цього","цьому","ним","нам","нас",
  "так","ні","чи","дуже","більш","менш","більше","менше","просто",
  "потрібно","можна","варто","треба","тобто","адже","один","два","три",
  "перший","перша","перше","далі","саме","крім","проте","однак","хоча",
  "щоб","оскільки","тож","будь","після","із","все","бо","зі","зо","аж","а",
]);

function syllables(w: string) {
  return Math.max(1, (w.match(/[аеєиіїоуюя]/gi) || []).length);
}

interface Metrics {
  charCount: number; wordCount: number; spaceCount: number;
  waterPct: number; spamPct: number; topSpamWord: string;
  headings: number; h2: number; listCount: number; hasLists: boolean;
  avgSentLen: number; paragraphs: number;
  mainKwCount: number; lsiFound: number; lsiTotal: number;
  flesch: number; numberCount: number; hasNumbers: boolean;
  textCodeRatio: number; titleLen: number; titleText: string;
  descLen: number; imageCount: number; lexDiv: number;
}

function analyze(text: string, mainKw = "", lsiWords: string[] = []): Metrics {
  const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
  const codeChars = codeBlocks.reduce((s, b) => s + b.length, 0);
  const noCode = text.replace(/```[\s\S]*?```/g, " ");
  const plain = noCode.replace(/^#+\s/gm,"").replace(/[*_~`[\]|]/g,"").replace(/!\[.*?\]\(.*?\)/g,"").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").trim();
  const words = plain.split(/\s+/).filter((w) => /[а-яёіїєa-z]/i.test(w));
  const charCount = text.length;
  const wordCount = words.length;
  const spaceCount = (text.match(/ /g) || []).length;
  const clean = words.map((w) => w.replace(/[^а-яёіїєa-zA-Z]/gi, "").toLowerCase());
  const waterCount = clean.filter((w) => WATER.has(w)).length;
  const waterPct = wordCount > 0 ? Math.round((waterCount / wordCount) * 100) : 0;
  const freq: Record<string, number> = {};
  clean.forEach((w) => { if (w.length > 3 && !WATER.has(w)) freq[w] = (freq[w] || 0) + 1; });
  const topEntry = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  const topSpamWord = topEntry?.[0] || "";
  const spamPct = wordCount > 0 ? Math.round(((topEntry?.[1] || 0) / wordCount) * 100) : 0;
  const headings = (text.match(/^#{2,6} .+/gm) || []).length;
  const h2 = (text.match(/^#{2,3} .+/gm) || []).length;
  const listCount = (text.match(/^[-*+] .+/gm) || []).length + (text.match(/^\d+\. .+/gm) || []).length;
  const hasLists = listCount > 0;
  const sents = plain.split(/(?<=[.!?])\s+/).filter((s) => s.split(/\s+/).length >= 3);
  const avgSentLen = sents.length > 0 ? Math.round(sents.reduce((s, sent) => s + sent.split(/\s+/).length, 0) / sents.length) : 0;
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 40 && !p.trim().startsWith("#")).length;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mainKwCount = mainKw.trim() ? (plain.toLowerCase().match(new RegExp(esc(mainKw.trim().toLowerCase()), "g")) || []).length : 0;
  const lsiFound = lsiWords.filter((lsi) => lsi.trim() && plain.toLowerCase().includes(lsi.trim().toLowerCase())).length;
  const totalSyl = clean.reduce((s, w) => s + syllables(w), 0);
  const rawFlesch = sents.length > 0 && wordCount > 0 ? 206.835 - 1.015 * (wordCount / sents.length) - 84.6 * (totalSyl / wordCount) : 50;
  const flesch = Math.max(0, Math.min(100, Math.round(rawFlesch)));
  const numMatches = plain.match(/\d+/g) || [];
  const numberCount = numMatches.length;
  const hasNumbers = numberCount > 0;
  const textCodeRatio = charCount > 0 ? Math.round(((charCount - codeChars) / charCount) * 100) : 100;
  const h1m = text.match(/^# (.+)/m);
  const titleText = h1m?.[1]?.trim() || "";
  const titleLen = titleText.length;
  const firstPara = text.split("\n").find((l) => { const t = l.trim(); return t.length > 60 && !t.startsWith("#") && !t.startsWith("|") && !t.startsWith("!") && !t.startsWith("-") && !t.startsWith("*"); }) || "";
  const descLen = firstPara.trim().length;
  const imageCount = (text.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const unique = new Set(clean.filter((w) => w.length > 2)).size;
  const lexDiv = wordCount > 0 ? Math.round((unique / wordCount) * 100) : 0;
  return { charCount, wordCount, spaceCount, waterPct, spamPct, topSpamWord, headings, h2, listCount, hasLists, avgSentLen, paragraphs, mainKwCount, lsiFound, lsiTotal: lsiWords.length, flesch, numberCount, hasNumbers, textCodeRatio, titleLen, titleText, descLen, imageCount, lexDiv };
}

type St = "green" | "yellow" | "red";
function st(key: string, val: number | boolean, extra?: { lsiTotal?: number }): St {
  const n = val as number;
  switch (key) {
    case "charCount":      return n >= 3000 ? "green" : n >= 1500 ? "yellow" : "red";
    case "wordCount":      return n >= 800 ? "green" : n >= 500 ? "yellow" : "red";
    case "waterPct":       return n <= 50 ? "green" : n <= 65 ? "yellow" : "red";
    case "spamPct":        return n <= 3 ? "green" : n <= 6 ? "yellow" : "red";
    case "headings":       return n >= 5 ? "green" : n >= 3 ? "yellow" : "red";
    case "hasLists":       return val ? "green" : "yellow";
    case "avgSentLen":     return n >= 8 && n <= 18 ? "green" : n <= 25 ? "yellow" : "red";
    case "paragraphs":     return n >= 8 ? "green" : n >= 4 ? "yellow" : "red";
    case "mainKwCount":    return n >= 3 && n <= 10 ? "green" : n >= 1 ? "yellow" : "red";
    case "lsiFound": {
      const t = extra?.lsiTotal || 0;
      if (t === 0) return "green";
      const r = n / t;
      return r >= 0.7 ? "green" : r >= 0.4 ? "yellow" : "red";
    }
    case "flesch":         return n >= 60 ? "green" : n >= 40 ? "yellow" : "red";
    case "hasNumbers":     return val ? "green" : "yellow";
    case "textCodeRatio":  return n >= 90 ? "green" : n >= 70 ? "yellow" : "red";
    case "titleLen":       return n >= 40 && n <= 65 ? "green" : n >= 20 ? "yellow" : "red";
    case "descLen":        return n >= 120 && n <= 160 ? "green" : n >= 80 ? "yellow" : "red";
    case "imageCount":     return n >= 2 ? "green" : n >= 1 ? "yellow" : "red";
    case "lexDiv":         return n >= 50 ? "green" : n >= 35 ? "yellow" : "red";
    default:               return "green";
  }
}

const Dot = ({ s }: { s: St }) => (
  <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${s === "green" ? "bg-green-500" : s === "yellow" ? "bg-yellow-500" : "bg-red-500"}`} />
);

// ── Semi-circle Gauge ─────────────────────────────────────────────────────────
const SemiGauge = ({
  value, label, sublabel, invert = false, size = 120,
}: {
  value: number; label: string; sublabel?: string; invert?: boolean; size?: number;
}) => {
  const r = 44;
  const cx = 60; const cy = 60;
  const arcLen = Math.PI * r; // ≈ 138.2
  const filled = (value / 100) * arcLen;

  // Color: if invert=false → high=bad(red), low=good(green)  [AI probability]
  //        if invert=true  → high=good(green), low=bad(red)  [perplexity, burstiness]
  const getColor = (v: number, inv: boolean) => {
    if (inv) return v >= 60 ? "#22c55e" : v >= 30 ? "#f59e0b" : "#ef4444";
    return v <= 30 ? "#22c55e" : v <= 60 ? "#f59e0b" : "#ef4444";
  };
  const color = getColor(value, invert);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size * 0.62} viewBox="0 0 120 74" style={{ overflow: "visible" }}>
        {/* Track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="hsl(220 13% 91%)" strokeWidth="9" strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${filled} ${arcLen}`}
          style={{ transition: "stroke-dasharray 0.7s ease-out" }}
        />
        {/* Value text */}
        <text x={cx} y={cy - 1} textAnchor="middle" fontSize="20" fontWeight="bold" fill={color}>
          {value}
        </text>
        {sublabel && (
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="8.5" fill="#888">{sublabel}</text>
        )}
      </svg>
      <p className="text-xs text-muted-foreground text-center leading-tight">{label}</p>
    </div>
  );
};

// ── AI verdict color ──────────────────────────────────────────────────────────
function verdictClass(p: number) {
  if (p >= 70) return "border-red-500/30 text-red-500 bg-red-500/5";
  if (p >= 40) return "border-yellow-500/30 text-yellow-600 bg-yellow-500/5";
  return "border-green-500/30 text-green-600 bg-green-500/5";
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface AIResult {
  aiProbability: number;
  perplexity: number;
  burstiness: number;
  repetitive_patterns: string[];
  verdict: string;
  signals: string[];
}

interface PlagSentence { idx: number; text: string; found: boolean; urls: string[]; }
interface PlagResult {
  uniqueness: number;
  sentences: PlagSentence[];
  sources: string[];
  checked: number;
  note?: string;
}
interface PlagProgress { done: number; total: number; found: boolean; eta: number; }

// ── ETA format ────────────────────────────────────────────────────────────────
function fmtEta(sec: number): string {
  if (sec <= 0) return "";
  if (sec < 60) return `~${sec} сек`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `~${m} хв ${s} сек` : `~${m} хв`;
}

// ── Highlighted text renderer ─────────────────────────────────────────────────
const HighlightedText = ({
  sentences,
  rewrittenMap,
  rewriting,
}: {
  sentences: PlagSentence[];
  rewrittenMap: Map<string, string>;
  rewriting: boolean;
}) => (
  <div className="rounded-xl border border-border bg-card/50 p-4 text-sm leading-relaxed max-h-80 overflow-y-auto">
    {sentences.map((sent) => {
      const rewritten = rewrittenMap.get(sent.text);
      if (rewritten) {
        return (
          <span
            key={sent.idx}
            className="bg-green-100 dark:bg-green-900/40 text-green-900 dark:text-green-200 rounded px-0.5 mx-0.5 transition-all duration-500"
            title="Переписано AI"
          >
            {rewritten}{" "}
          </span>
        );
      }
      if (sent.found) {
        return (
          <span
            key={sent.idx}
            className={`bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-100 rounded px-0.5 mx-0.5 cursor-help ${rewriting ? "animate-pulse" : ""}`}
            title={sent.urls[0] ? `Джерело: ${sent.urls[0]}` : "Знайдено збіг у пошуку"}
          >
            {sent.text}{" "}
          </span>
        );
      }
      return <span key={sent.idx}>{sent.text}{" "}</span>;
    })}
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  text: string;
  mainKeyword?: string;
  lsiWords?: string[];
  metaTitle?: string;
  metaDescription?: string;
}

const ContentQuality = ({ text, mainKeyword = "", lsiWords = [], metaTitle = "", metaDescription = "" }: Props) => {
  const [expanded, setExpanded] = useState(true);

  // AI detector state
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Plagiarism state
  const [plagResult, setPlagResult] = useState<PlagResult | null>(null);
  const [plagLoading, setPlagLoading] = useState(false);
  const [plagProgress, setPlagProgress] = useState<PlagProgress | null>(null);
  const plagAbortRef = useRef<AbortController | null>(null);

  // Rewriter state
  const [rewrittenMap, setRewrittenMap] = useState<Map<string, string>>(new Map());
  const [rewriting, setRewriting] = useState(false);

  if (!text?.trim()) return null;

  const m = analyze(text, mainKeyword, lsiWords);

  function calcSeoScore(
    text: string,
    m: Metrics,
    mainKw: string,
    metaTitle: string,
    metaDesc: string,
  ): { total: number; breakdown: { label: string; score: number; max: number; hint: string }[] } {
    const kw = mainKw.trim().toLowerCase();
    const headingLines = text.match(/^#{1,6} .+/gm) || [];
    const headingsText = headingLines.join(" ").toLowerCase();
    // 1. Keyword in headings + meta (20 pts)
    let kwScore = 0;
    if (kw) {
      if (headingsText.includes(kw)) kwScore += 10;
      if (metaTitle.toLowerCase().includes(kw)) kwScore += 5;
      if (metaDesc.toLowerCase().includes(kw)) kwScore += 5;
    } else {
      kwScore = 10;
    }
    // 2. Heading hierarchy (10 pts)
    const hasH1 = /^# .+/m.test(text);
    const hasH2 = /^## .+/m.test(text);
    const hasH3 = /^### .+/m.test(text);
    const hierarchyScore = (hasH1 ? 4 : 0) + (hasH2 ? 4 : 0) + (hasH3 ? 2 : 0);
    // 3. Meta description (10 pts)
    let metaScore = 0;
    if (metaDesc) {
      if (metaDesc.length >= 120 && metaDesc.length <= 160) metaScore = 10;
      else if (metaDesc.length >= 80) metaScore = 6;
      else metaScore = 3;
    } else if (m.descLen >= 120 && m.descLen <= 160) {
      metaScore = 7;
    } else if (m.descLen >= 80) {
      metaScore = 4;
    }
    // 4. Text length (20 pts)
    let lengthScore = 0;
    if (m.wordCount >= 2000) lengthScore = 20;
    else if (m.wordCount >= 1200) lengthScore = 15;
    else if (m.wordCount >= 800) lengthScore = 10;
    else if (m.wordCount >= 500) lengthScore = 5;
    // 5. Internal + external links (10 pts)
    const internalLinks = (text.match(/\[([^\]]+)\]\(\/[^)]*\)/g) || []).length;
    const externalLinks = (text.match(/\[([^\]]+)\]\(https?:\/\/[^)]*\)/g) || []).length;
    let linksScore = 0;
    if (internalLinks > 0) linksScore += 5;
    if (externalLinks > 0) linksScore += 5;
    // 6. Images (10 pts)
    let imgScore = 0;
    if (m.imageCount >= 3) imgScore = 10;
    else if (m.imageCount >= 2) imgScore = 7;
    else if (m.imageCount >= 1) imgScore = 4;
    // 7. Metadata completeness (10 pts)
    let metadataScore = 0;
    if (metaTitle) metadataScore += 5;
    if (metaDesc) metadataScore += 3;
    if (m.titleLen > 0) metadataScore += 2;
    const total = kwScore + hierarchyScore + metaScore + lengthScore + linksScore + imgScore + metadataScore;
    return {
      total,
      breakdown: [
        { label: "Ключові слова в заголовках і мета", score: kwScore,        max: 20, hint: "Ключове слово в H1/H2, title, description" },
        { label: "Ієрархія заголовків",               score: hierarchyScore, max: 10, hint: "Наявність H1 + H2 + H3" },
        { label: "Мета опис",                         score: metaScore,      max: 10, hint: "120–160 символів з ключовим словом" },
        { label: "Довжина тексту",                    score: lengthScore,    max: 20, hint: "≥2000 слів = 20 балів" },
        { label: "Внутрішні та зовнішні посилання",   score: linksScore,     max: 10, hint: "Є внутрішні (/...) і зовнішні (https://...) посилання" },
        { label: "Зображення",                        score: imgScore,       max: 10, hint: "≥3 зображення = 10 балів" },
        { label: "Метадані",                          score: metadataScore,  max: 10, hint: "Заповнені title, description, H1" },
      ],
    };
  }

  const seo = calcSeoScore(text, m, mainKeyword, metaTitle, metaDescription);
  const seoColor = seo.total >= 70 ? "text-green-600" : seo.total >= 50 ? "text-yellow-600" : "text-red-500";
  const seoBorderColor = seo.total >= 70 ? "border-green-500/30 bg-green-500/5" : seo.total >= 50 ? "border-yellow-500/30 bg-yellow-500/5" : "border-red-500/30 bg-red-500/5";

  const rows: { key: string; label: string; val: string | number; status: St; hint: string }[] = [
    { key: "charCount",     label: "Символів",                    val: m.charCount.toLocaleString(),                                    status: st("charCount", m.charCount),         hint: "Рекомендовано ≥ 3000" },
    { key: "wordCount",     label: "Слів",                        val: m.wordCount.toLocaleString(),                                    status: st("wordCount", m.wordCount),         hint: "Рекомендовано ≥ 800" },
    { key: "spaceCount",    label: "Пробілів",                    val: m.spaceCount.toLocaleString(),                                   status: "green",                              hint: "Інформаційно" },
    { key: "waterPct",      label: "Водність",                    val: `${m.waterPct}%`,                                                status: st("waterPct", m.waterPct),           hint: "Норма ≤ 50%" },
    { key: "spamPct",       label: "Заспамленість",               val: `${m.spamPct}%${m.topSpamWord ? ` "${m.topSpamWord}"` : ""}`,   status: st("spamPct", m.spamPct),             hint: "Норма ≤ 3%" },
    { key: "headings",      label: "Заголовків H2–H6",            val: m.headings,                                                     status: st("headings", m.headings),           hint: "Рекомендовано ≥ 5" },
    { key: "hasLists",      label: "Марковані списки",            val: m.hasLists ? `Є (${m.listCount} елем.)` : "Відсутні",           status: st("hasLists", m.hasLists),           hint: "Покращують структуру" },
    { key: "avgSentLen",    label: "Сер. довжина речення",        val: `${m.avgSentLen} слів`,                                          status: st("avgSentLen", m.avgSentLen),       hint: "Норма 8–18 слів" },
    { key: "paragraphs",    label: "Абзаців",                     val: m.paragraphs,                                                   status: st("paragraphs", m.paragraphs),       hint: "Рекомендовано ≥ 8" },
    { key: "mainKwCount",   label: mainKeyword ? `Ключ "${mainKeyword.slice(0, 18)}${mainKeyword.length > 18 ? "…" : ""}"` : "Головний ключ", val: `${m.mainKwCount} вжив.`, status: st("mainKwCount", m.mainKwCount), hint: "Норма 3–10 разів" },
    { key: "lsiFound",      label: `LSI слів (${m.lsiFound}/${m.lsiTotal})`, val: m.lsiTotal > 0 ? `${Math.round((m.lsiFound / m.lsiTotal) * 100)}%` : "Не задано", status: st("lsiFound", m.lsiFound, { lsiTotal: m.lsiTotal }), hint: "Рекомендовано ≥ 70%" },
    { key: "flesch",        label: "Flesch читабельність",        val: `${m.flesch}/100`,                                               status: st("flesch", m.flesch),               hint: "Норма ≥ 60" },
    { key: "hasNumbers",    label: "Числа в тексті",              val: m.hasNumbers ? `Є (${m.numberCount} шт.)` : "Відсутні",         status: st("hasNumbers", m.hasNumbers),       hint: "Цифри підвищують довіру" },
    { key: "textCodeRatio", label: "Текст vs Код",                val: `${m.textCodeRatio}% текст`,                                     status: st("textCodeRatio", m.textCodeRatio), hint: "Норма ≥ 90% тексту" },
    { key: "titleLen",      label: "Довжина Title (H1)",          val: m.titleLen > 0 ? `${m.titleLen} симв.` : "H1 не знайдено",       status: st("titleLen", m.titleLen),           hint: "Норма 40–65 символів" },
    { key: "descLen",       label: "Довжина 1-го абзацу",         val: `${m.descLen} симв.`,                                            status: st("descLen", m.descLen),             hint: "Оптим. 120–160 символів" },
    { key: "imageCount",    label: "Зображень",                   val: m.imageCount,                                                   status: st("imageCount", m.imageCount),       hint: "Рекомендовано ≥ 2" },
    { key: "lexDiv",        label: "Лексична різноманіт.",        val: `${m.lexDiv}%`,                                                  status: st("lexDiv", m.lexDiv),               hint: "Норма ≥ 50% унікальних слів" },
  ];

  const greenN = rows.filter((r) => r.status === "green").length;
  const yellowN = rows.filter((r) => r.status === "yellow").length;
  const redN = rows.filter((r) => r.status === "red").length;
  const score = Math.round((greenN / rows.length) * 100);
  const scoreClass = score >= 70 ? "border-green-500/30 text-green-600 bg-green-500/5"
    : score >= 50 ? "border-yellow-500/30 text-yellow-600 bg-yellow-500/5"
    : "border-red-500/30 text-red-500 bg-red-500/5";

  // ── AI detect handler ────────────────────────────────────────────────────────
  const runAi = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await apiFetch("/api/ai-detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiResult(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка AI-детекції");
    } finally {
      setAiLoading(false);
    }
  };

  // ── Plagiarism handler ───────────────────────────────────────────────────────
  const runPlag = async () => {
    plagAbortRef.current?.abort();
    plagAbortRef.current = new AbortController();
    setPlagLoading(true);
    setPlagResult(null);
    setPlagProgress(null);
    setRewrittenMap(new Map());

    try {
      const res = await apiFetch("/api/plagiarism-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: plagAbortRef.current.signal,
      });
      if (!res.ok || !res.body) throw new Error((await res.json()).error || `Помилка ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "start") {
              setPlagProgress({ done: 0, total: ev.total, found: false, eta: 0 });
            } else if (ev.type === "progress") {
              setPlagProgress({ done: ev.done, total: ev.total, found: ev.found, eta: ev.eta ?? 0 });
            } else if (ev.type === "result") {
              setPlagResult({
                uniqueness: ev.uniqueness,
                sentences: ev.sentences || [],
                sources: ev.sources || [],
                checked: ev.checked,
                note: ev.note,
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name !== "AbortError") {
        toast.error(e instanceof Error ? e.message : "Помилка перевірки унікальності");
      }
    } finally {
      setPlagLoading(false);
      setPlagProgress(null);
    }
  };

  const stopPlag = () => {
    plagAbortRef.current?.abort();
    setPlagLoading(false);
    setPlagProgress(null);
    toast.info("Перевірку зупинено");
  };

  // ── Rewriter handler ─────────────────────────────────────────────────────────
  const runRewrite = async () => {
    if (!plagResult) return;
    const problematic = plagResult.sentences
      .filter((s) => s.found && !rewrittenMap.has(s.text))
      .map((s) => s.text);

    if (!problematic.length) {
      toast.info("Немає проблемних ділянок або всі вже переписано");
      return;
    }

    setRewriting(true);
    try {
      const res = await apiFetch("/api/rewrite-fragment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fragments: problematic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newMap = new Map(rewrittenMap);
      (data.rewrites as string[]).forEach((rewrite, i) => {
        if (problematic[i]) newMap.set(problematic[i], rewrite);
      });
      setRewrittenMap(newMap);

      // Recalculate uniqueness optimistically
      const newFound = plagResult.sentences.filter(
        (s) => s.found && !newMap.has(s.text),
      ).length;
      const newUniq = Math.round(
        ((plagResult.sentences.length - newFound) / plagResult.sentences.length) * 100,
      );
      setPlagResult((prev) => prev ? { ...prev, uniqueness: newUniq } : prev);

      toast.success(`${data.rewrites.length} фрагментів переписано`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка переписування");
    } finally {
      setRewriting(false);
    }
  };

  const foundCount = plagResult?.sentences.filter((s) => s.found).length ?? 0;
  const rewrittenCount = rewrittenMap.size;
  const remainingProblematic = foundCount - rewrittenCount;

  return (
    <div className="space-y-4">
      {/* ── SEO Score ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              SEO Score
            </CardTitle>
            <Badge variant="outline" className={`text-lg font-bold px-3 py-1 ${seoBorderColor} ${seoColor}`}>
              {seo.total} / 90
            </Badge>
          </div>
          <Progress value={(seo.total / 90) * 100} className="h-2 mt-2" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {seo.breakdown.map((item) => {
              const pct = (item.score / item.max) * 100;
              const itemColor = pct >= 80 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-500";
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground" title={item.hint}>{item.label}</span>
                    <span className={`font-semibold ${itemColor}`}>{item.score}/{item.max}</span>
                  </div>
                  <Progress value={pct} className="h-1" />
                </div>
              );
            })}
          </div>
          {metaTitle === "" && metaDescription === "" && (
            <p className="text-xs text-muted-foreground mt-3 border border-dashed rounded p-2">
              💡 Заповніть мета теги в інструменті ТЗ та збережіть публікацію — SEO Score буде точнішим
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── 18 параметрів ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-base">Аналіз якості контенту</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">{greenN} ✓</span>
                <span className="text-yellow-500 font-medium">{yellowN} !</span>
                {redN > 0 && <span className="text-red-500 font-medium">{redN} ✗</span>}
              </div>
              <Badge variant="outline" className={`text-xs font-bold ${scoreClass}`}>{score}%</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-7 text-xs text-muted-foreground gap-1">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? "Згорнути" : "Розгорнути"}
            </Button>
          </div>
          <Progress value={score} className="h-1.5 mt-2" />
        </CardHeader>
        {expanded && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
              {rows.map((row, i) => (
                <div key={row.key} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 mr-2">
                    <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">{i + 1}</span>
                    <Dot s={row.status} />
                    <span className="text-xs truncate" title={row.hint}>{row.label}</span>
                  </div>
                  <span className={`text-xs font-mono shrink-0 font-semibold ${row.status === "green" ? "text-green-600" : row.status === "yellow" ? "text-yellow-600" : "text-red-500"}`}>
                    {row.val}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── AI + Plagiarism ── */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* ── AI Detector ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              Детектор AI-тексту
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!aiResult && !aiLoading && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Gemini аналізує <strong>Perplexity</strong> (непередбачуваність фраз) та <strong>Burstiness</strong> (різноманіть довжин речень) — два ключових показники для відрізнення людського тексту від AI.
              </p>
            )}

            {aiLoading && (
              <div className="flex items-center gap-3 py-4 justify-center text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                <span>Gemini аналізує метрики...</span>
              </div>
            )}

            {aiResult && (
              <div className="space-y-4">
                {/* Main gauge — AI probability */}
                <div className="flex flex-col items-center">
                  <SemiGauge
                    value={aiResult.aiProbability}
                    label="Ймовірність генерації AI"
                    sublabel="%"
                    invert={false}
                    size={150}
                  />
                </div>

                {/* Verdict */}
                <div className="flex justify-center">
                  <Badge variant="outline" className={`text-sm font-semibold px-3 py-1 ${verdictClass(aiResult.aiProbability)}`}>
                    {aiResult.verdict}
                  </Badge>
                </div>

                {/* Perplexity + Burstiness mini gauges */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border bg-secondary/30 p-3">
                    <SemiGauge
                      value={aiResult.perplexity}
                      label="Perplexity"
                      sublabel="непередбачуваність"
                      invert={true}
                      size={100}
                    />
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/30 p-3">
                    <SemiGauge
                      value={aiResult.burstiness}
                      label="Burstiness"
                      sublabel="різноманіть речень"
                      invert={true}
                      size={100}
                    />
                  </div>
                </div>

                {/* Repetitive patterns */}
                {aiResult.repetitive_patterns?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Шаблонні конструкції</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiResult.repetitive_patterns.map((p, i) => (
                        <span key={i} className="text-xs bg-red-500/10 text-red-600 border border-red-500/20 rounded px-2 py-0.5">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Signals */}
                {aiResult.signals?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Сигнали</p>
                    <ul className="space-y-1.5">
                      {aiResult.signals.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5 shrink-0">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <Button
              variant="outline" size="sm"
              onClick={runAi} disabled={aiLoading}
              className="w-full text-xs gap-1.5"
            >
              {aiLoading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Аналізую...</>
                : <><Brain className="h-3.5 w-3.5 text-purple-500" />{aiResult ? "Перевірити знову" : "Перевірити на AI"}</>}
            </Button>
          </CardContent>
        </Card>

        {/* ── Plagiarism checker ───────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Перевірка унікальності
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!plagResult && !plagLoading && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Текст ділиться на окремі речення. Кожне перевіряється через SearXNG з затримкою <strong>4–5 с</strong> між запитами. Збіги підсвічуються червоним.
                </p>
                <p className="text-xs text-muted-foreground">Для тексту ~2500 слів: ~50 речень, ~4–5 хв.</p>
              </div>
            )}

            {/* Progress */}
            {plagLoading && (
              <div className="space-y-2">
                {plagProgress ? (
                  <>
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-semibold text-foreground">
                        Перевірено {plagProgress.done} / {plagProgress.total} речень
                      </span>
                      <span className="text-muted-foreground">
                        {plagProgress.total > 0
                          ? `${Math.round((plagProgress.done / plagProgress.total) * 100)}%`
                          : ""}
                        {plagProgress.eta > 0 && ` · Залишилось ${fmtEta(plagProgress.eta)}`}
                      </span>
                    </div>
                    <Progress
                      value={plagProgress.total > 0 ? (plagProgress.done / plagProgress.total) * 100 : 0}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Останнє речення: {plagProgress.found
                        ? <span className="text-red-500 font-medium">знайдено збіг</span>
                        : <span className="text-green-600 font-medium">унікальне</span>}
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />Витягую речення...
                  </div>
                )}
                <Button
                  variant="outline" size="sm"
                  onClick={stopPlag}
                  className="w-full text-xs gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/5"
                >
                  <StopCircle className="h-3.5 w-3.5" />Зупинити перевірку
                </Button>
              </div>
            )}

            {/* Results */}
            {plagResult && !plagLoading && (
              <div className="space-y-3">
                {/* Uniqueness score */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Унікальність тексту</span>
                    <span className={`text-xl font-bold ${plagResult.uniqueness >= 80 ? "text-green-500" : plagResult.uniqueness >= 60 ? "text-yellow-500" : "text-red-500"}`}>
                      {plagResult.uniqueness}%
                    </span>
                  </div>
                  <Progress value={plagResult.uniqueness} className="h-2.5" />
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-xs ${plagResult.uniqueness >= 80 ? "border-green-500/30 text-green-600 bg-green-500/5" : plagResult.uniqueness >= 60 ? "border-yellow-500/30 text-yellow-600 bg-yellow-500/5" : "border-red-500/30 text-red-500 bg-red-500/5"}`}>
                      {plagResult.uniqueness >= 80 ? "✓ Унікальний" : plagResult.uniqueness >= 60 ? "⚠ Частково унікальний" : "✗ Низька унікальність"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {foundCount} з {plagResult.checked} речень знайдено
                    </span>
                  </div>
                </div>

                {/* Highlighted text */}
                {plagResult.sentences.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-block h-3 w-3 rounded bg-red-200 dark:bg-red-900/40 border border-red-400/40" />
                      <span>Знайдено в пошуку</span>
                      <span className="inline-block h-3 w-3 rounded bg-green-200 dark:bg-green-900/40 border border-green-400/40 ml-2" />
                      <span>Переписано</span>
                    </div>
                    <HighlightedText
                      sentences={plagResult.sentences}
                      rewrittenMap={rewrittenMap}
                      rewriting={rewriting}
                    />
                  </div>
                )}

                {/* Sources */}
                {plagResult.sources.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Знайдені джерела ({plagResult.sources.length})
                    </p>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {plagResult.sources.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline truncate"
                        >
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          {url.replace(/^https?:\/\//, "").slice(0, 60)}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {plagResult.note && (
                  <p className="text-xs text-muted-foreground">{plagResult.note}</p>
                )}

                {/* Rewriter button */}
                {foundCount > 0 && (
                  <Button
                    onClick={runRewrite}
                    disabled={rewriting || remainingProblematic === 0}
                    size="sm"
                    className="w-full text-xs gap-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 border-0 text-white hover:opacity-90"
                  >
                    {rewriting ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" />Gemini переписує...</>
                    ) : remainingProblematic === 0 ? (
                      <><CheckCircle2 className="h-3.5 w-3.5" />Всі ділянки переписано</>
                    ) : (
                      <><Wand2 className="h-3.5 w-3.5" />Унікалізувати {remainingProblematic} проблемних ділянки</>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Start / Re-check button */}
            {!plagLoading && (
              <Button
                variant="outline" size="sm"
                onClick={runPlag}
                className="w-full text-xs gap-1.5"
              >
                {plagResult
                  ? <><RefreshCw className="h-3.5 w-3.5 text-emerald-500" />Перевірити знову</>
                  : <><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />Перевірити унікальність</>}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContentQuality;
