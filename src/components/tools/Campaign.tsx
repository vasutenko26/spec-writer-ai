import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/contexts/AuthContext";
import WordPressModal from "@/components/WordPressModal";
import { getWpSettings } from "@/lib/wordpress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Gauge, FileBarChart, FileText, Sparkles,
  CheckCircle2, Loader2, XCircle, Download, Rocket,
  Clock, BarChart3, LayoutList, ArrowRight, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { GEMINI_MODELS, callWithModelFallback, type GeminiModelId } from "@/lib/geminiFallback";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { exportMarkdownToDocx } from "@/lib/exportDocx";
import OutlineBuilder, { type OutlineItem, serpPagesToCompetitors } from "@/components/tools/OutlineBuilder";
import type { SerpPage } from "@/contexts/AppStateContext";

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  { id: 0, label: "Аналіз видачі",    desc: "SearXNG ТОП-10",       icon: Search },
  { id: 1, label: "Технічний аудит",  desc: "PageSpeed конкурента",  icon: Gauge },
  { id: 2, label: "LSI-аналіз",       desc: "Частотні слова ТОП-10", icon: FileBarChart },
  { id: 3, label: "Генерація ТЗ",     desc: "Технічне завдання",     icon: FileText },
  { id: 4, label: "Генерація тексту", desc: "SEO-стаття",            icon: Sparkles },
] as const;

type StepStatus = "pending" | "running" | "done" | "error" | "waiting";
interface StepState { status: StepStatus; preview?: string; error?: string; }

interface CampaignResult {
  serpStats?: { avgWords: number; successfulScrapes: number };
  pagespeedScores?: Record<string, number>;
  lsiCount?: number;
  briefText?: string;
  articleText?: string;
  lsiWords?: { word: string; totalFreq: number; docFreq: number; recommended: number }[];
}

// ── Stepper bubble ─────────────────────────────────────────────────────────────
const StepBubble = ({ step, status, isCurrent }: {
  step: typeof STEPS[number]; status: StepStatus; isCurrent: boolean;
}) => {
  const Icon = step.icon;
  const cls =
    status === "done"    ? "bg-green-500 border-green-500 text-white"
    : status === "running" ? "bg-primary border-primary text-white animate-pulse"
    : status === "waiting" ? "bg-amber-500 border-amber-500 text-white"
    : status === "error"   ? "bg-red-500 border-red-500 text-white"
    : "bg-background border-border text-muted-foreground";
  return (
    <div className={`flex flex-col items-center gap-1.5 ${isCurrent || status !== "pending" ? "opacity-100" : "opacity-50"}`}>
      <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all ${cls}`}>
        {status === "running" ? <Loader2 className="h-4 w-4 animate-spin" />
         : status === "done"  ? <CheckCircle2 className="h-4 w-4" />
         : status === "error" ? <XCircle className="h-4 w-4" />
         : status === "waiting" ? <LayoutList className="h-4 w-4" />
         : <Icon className="h-4 w-4" />}
      </div>
      <div className="text-center">
        <p className="text-xs font-medium leading-tight">{step.label}</p>
        <p className="text-xs text-muted-foreground leading-tight hidden sm:block">{step.desc}</p>
      </div>
    </div>
  );
};

// ── Markdown renderer ─────────────────────────────────────────────────────────
const MarkdownContent = ({ content, maxHeight = "70vh" }: { content: string; maxHeight?: string }) => (
  <div className="overflow-y-auto" style={{ maxHeight }}>
    <article className="prose prose-sm max-w-none dark:prose-invert
      prose-headings:scroll-mt-4
      prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-4
      prose-h2:text-xl prose-h2:font-bold prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:mb-4 prose-h2:mt-8
      prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-6
      prose-p:leading-relaxed prose-li:leading-relaxed prose-strong:text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto rounded-lg border border-border my-4 not-prose">
              <table className="w-full text-sm border-collapse" {...props}>{children}</table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="bg-secondary px-3 py-2 text-left font-semibold border border-border text-xs whitespace-nowrap" {...props}>{children}</th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-3 py-2 border border-border text-xs" {...props}>{children}</td>
          ),
          tr: ({ children, ...props }) => (
            <tr className="even:bg-secondary/40 hover:bg-secondary/60 transition-colors" {...props}>{children}</tr>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  </div>
);

// ── WP icon ───────────────────────────────────────────────────────────────────
const WpIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM3.73 12c0-1.25.27-2.43.74-3.5L8.1 19.47A8.28 8.28 0 0 1 3.73 12zm8.27 8.28c-.84 0-1.65-.12-2.42-.34l2.57-7.46 2.63 7.21c.02.04.04.08.06.11a8.3 8.3 0 0 1-2.84.48zm1.17-12.4c.51-.03.97-.08.97-.08.46-.06.4-.72-.06-.69 0 0-1.37.11-2.26.11-.83 0-2.23-.11-2.23-.11-.46-.03-.52.65-.06.68 0 0 .44.05.91.08l1.34 3.68-1.89 5.66-3.14-9.34c.51-.03.97-.08.97-.08.46-.06.4-.72-.06-.69 0 0-1.37.11-2.26.11-.16 0-.34 0-.53-.01A8.28 8.28 0 0 1 12 3.72c2.17 0 4.15.83 5.63 2.19-.04 0-.07-.01-.11-.01-.83 0-1.42.72-1.42 1.5 0 .7.4 1.28.83 1.98.32.56.7 1.28.7 2.32 0 .72-.27 1.56-.63 2.72l-.83 2.76-3.0-8.34zm4.69 11.52-2.59-7.08.05-.14c.53-1.34.71-2.4.71-3.36 0-.35-.02-.67-.07-.97A8.27 8.27 0 0 1 20.27 12a8.27 8.27 0 0 1-3.41 6.94v.46z"/>
  </svg>
);

// ── Excel export ──────────────────────────────────────────────────────────────
function exportCampaignExcel(keyword: string, result: CampaignResult) {
  const wb = XLSX.utils.book_new();

  const summary = [{
    "Ключове слово": keyword,
    "Дата": new Date().toLocaleDateString("uk-UA"),
    "Сторінок у ТОП-10": result.serpStats?.successfulScrapes ?? "—",
    "Сер. слів у конкурентів": result.serpStats?.avgWords ?? "—",
    "PageSpeed Performance": result.pagespeedScores?.performance ?? "—",
    "PageSpeed SEO": result.pagespeedScores?.seo ?? "—",
    "LSI-слів знайдено": result.lsiCount ?? "—",
  }];
  const ws1 = XLSX.utils.json_to_sheet(summary);
  ws1["!cols"] = [{ wch: 30 }, { wch: 14 }, { wch: 20 }, { wch: 24 }, { wch: 22 }, { wch: 16 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Зведення");

  if (result.lsiWords?.length) {
    const ws2 = XLSX.utils.json_to_sheet(
      result.lsiWords.map((w, i) => ({
        "№": i + 1, "Слово": w.word,
        "Зустрічається (сторінок)": w.docFreq,
        "Загальна частота": w.totalFreq,
        "Рекомендовано": w.recommended,
      }))
    );
    ws2["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 24 }, { wch: 20 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws2, "LSI-слова");
  }

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const safe = keyword.replace(/[^a-zA-Zа-яёіїє0-9]/gi, "-").slice(0, 40);
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `campaign-${safe}.xlsx`);
  toast.success("Excel завантажено");
}

// ── Main component ─────────────────────────────────────────────────────────────
const Campaign = () => {
  const { currentUser } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [geminiModel, setGeminiModel] = useState<GeminiModelId>("auto");
  const [wpModalOpen, setWpModalOpen] = useState(false);
  const [manualStructure, setManualStructure] = useState(false);
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [steps, setSteps] = useState<StepState[]>(STEPS.map(() => ({ status: "pending" })));
  const [result, setResult] = useState<CampaignResult>({});
  const [done, setDone] = useState(false);
  const [activeModel, setActiveModel] = useState<string | null>(null);

  // Manual structure state
  const [waitingForStructure, setWaitingForStructure] = useState(false);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [serpPages, setSerpPages] = useState<SerpPage[]>([]);
  const resumeRef = useRef<(() => void) | null>(null);

  const updateStep = (i: number, patch: Partial<StepState>) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const handleContinueWithStructure = () => {
    resumeRef.current?.();
    resumeRef.current = null;
  };

  const runCampaign = async () => {
    if (!keyword.trim()) { toast.error("Введіть ключове слово"); return; }
    setRunning(true);
    setDone(false);
    setResult({});
    setSteps(STEPS.map(() => ({ status: "pending" })));
    setCurrentStep(0);
    setWaitingForStructure(false);
    setOutline([]);
    setSerpPages([]);
    setActiveModel(null);

    const r: CampaignResult = {};

    try {
      // Step 0: SERP
      updateStep(0, { status: "running" });
      const serpRes = await apiFetch("/api/serp-analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), region: "ua", language: "uk" }),
      });
      if (!serpRes.ok) throw new Error(`SERP: ${(await serpRes.json()).error}`);
      const serpData = await serpRes.json();
      r.serpStats = serpData.stats;
      setSerpPages(serpData.pages || []);
      updateStep(0, { status: "done", preview: `${serpData.pages?.length ?? 0} сторінок · сер. ${serpData.stats?.avgWords ?? "?"} слів` });

      // Step 1: PageSpeed
      setCurrentStep(1); updateStep(1, { status: "running" });
      const psUrl = competitorUrl.trim()
        ? (competitorUrl.startsWith("http") ? competitorUrl.trim() : `https://${competitorUrl.trim()}`)
        : (serpData.pages?.[0]?.url || "");
      if (psUrl) {
        try {
          const psRes = await apiFetch(`/api/pagespeed?url=${encodeURIComponent(psUrl)}`);
          if (psRes.ok) {
            const psData = await psRes.json();
            r.pagespeedScores = psData.scores;
            const avg = Math.round(Object.values(psData.scores as Record<string, number>).reduce((a, b) => a + b, 0) / 4);
            updateStep(1, { status: "done", preview: `Perf ${psData.scores.performance} · SEO ${psData.scores.seo} · Avg ${avg}` });
          } else { updateStep(1, { status: "done", preview: "Пропущено (немає API-ключа)" }); }
        } catch { updateStep(1, { status: "done", preview: "Аудит недоступний" }); }
      } else { updateStep(1, { status: "done", preview: "URL не вказано — пропущено" }); }

      // Step 2: LSI
      setCurrentStep(2); updateStep(2, { status: "running" });
      const lsiRes = await apiFetch("/api/lsi-analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), region: "ua" }),
      });
      if (!lsiRes.ok) throw new Error(`LSI: ${(await lsiRes.json()).error}`);
      const lsiData = await lsiRes.json();
      r.lsiCount = lsiData.words?.length ?? 0;
      r.lsiWords = lsiData.words?.slice(0, 40) || [];
      updateStep(2, { status: "done", preview: `${lsiData.words?.length ?? 0} LSI-слів · ${lsiData.pagesAnalyzed} сторінок` });

      // Step 3: Brief — pause for manual structure if requested
      setCurrentStep(3);
      let structureToUse: OutlineItem[] = [];

      if (manualStructure) {
        updateStep(3, { status: "waiting", preview: "Очікування налаштування структури..." });
        setWaitingForStructure(true);
        // Pre-populate builder with fetched SERP pages
        setSerpPages(serpData.pages || []);

        await new Promise<void>((resolve) => { resumeRef.current = resolve; });

        setWaitingForStructure(false);
        structureToUse = outline; // captured by closure reference at resume time
        updateStep(3, { status: "running", preview: structureToUse.length > 0 ? `Структура: ${structureToUse.length} заголовків` : "Генерація ТЗ..." });
      } else {
        updateStep(3, { status: "running" });
      }

      const { data: briefData } = await callWithModelFallback(
        "/api/generate-brief",
        {
          keyword: keyword.trim(),
          language: "uk",
          region: "ua",
          contentType: "article",
          serpData: serpData.pages || [],
          ...(structureToUse.length > 0 && { customStructure: structureToUse }),
        },
        geminiModel,
        (_id, label) => setActiveModel(label),
      );
      r.briefText = briefData.content || "";
      setActiveModel(GEMINI_MODELS.find((m) => m.id === briefData.modelUsed)?.label ?? briefData.modelUsed ?? null);
      updateStep(3, { status: "done", preview: `ТЗ готове · ${r.briefText.split(/\s+/).length} слів${structureToUse.length > 0 ? ` · ${structureToUse.length} заг.` : ""}` });

      // Step 4: Content
      setCurrentStep(4); updateStep(4, { status: "running" });
      const topLsi = (r.lsiWords || []).slice(0, 10).map((w) => w.word).join(", ");
      const { data: contentData } = await callWithModelFallback(
        "/api/generate-content",
        { topic: keyword.trim(), keywords: topLsi, tone: "informational", wordCount: 2500 },
        geminiModel,
        (_id, label) => setActiveModel(label),
      );
      r.articleText = contentData.content || "";
      setActiveModel(GEMINI_MODELS.find((m) => m.id === contentData.modelUsed)?.label ?? contentData.modelUsed ?? null);
      updateStep(4, { status: "done", preview: `Стаття готова · ${r.articleText.split(/\s+/).length} слів` });

      setResult(r);
      setDone(true);
      toast.success("Кампанія завершена! Всі матеріали готові.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Невідома помилка";
      const failedStep = currentStep;
      updateStep(failedStep >= 0 ? failedStep : 0, { status: "error", error: msg });
      setWaitingForStructure(false);
      toast.error(msg);
    } finally {
      setRunning(false);
      setCurrentStep(-1);
    }
  };

  const reset = () => {
    setSteps(STEPS.map(() => ({ status: "pending" })));
    setResult({});
    setDone(false);
    setCurrentStep(-1);
    setWaitingForStructure(false);
    setOutline([]);
    setSerpPages([]);
    setActiveModel(null);
  };

  const doneCount = steps.filter((s) => s.status === "done").length;
  const progressPct = (doneCount / STEPS.length) * 100;

  const handleExportBrief = async () => {
    if (!result.briefText) return;
    try {
      await exportMarkdownToDocx(result.briefText, `tz-${keyword.trim().slice(0, 30)}.docx`);
      toast.success("ТЗ у Word завантажено");
    } catch { toast.error("Помилка створення Word-документа"); }
  };

  const handleExportArticle = async () => {
    if (!result.articleText) return;
    try {
      await exportMarkdownToDocx(result.articleText, `article-${keyword.trim().slice(0, 30)}.docx`);
      toast.success("Статтю у Word завантажено");
    } catch { toast.error("Помилка створення Word-документа"); }
  };

  return (
    <div className="space-y-6">
      {/* Input form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Автоматична SEO-кампанія
          </CardTitle>
          <CardDescription>
            Введіть ключове слово — система автоматично виконає аналіз видачі, технічний аудит, збір LSI, генерацію ТЗ і статті.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="camp-kw">Головне ключове слово *</Label>
              <Input
                id="camp-kw"
                placeholder="Наприклад: купити ноутбук для роботи"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                disabled={running}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="camp-url">URL конкурента для аудиту (необов'язково)</Label>
              <Input
                id="camp-url"
                placeholder="https://competitor.com/page"
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                disabled={running}
              />
              <p className="text-xs text-muted-foreground">Якщо порожньо — аудит першого результату пошуку</p>
            </div>
          </div>

          {/* Model selector */}
          <div className="space-y-2">
            <Label>Модель Gemini</Label>
            <Select value={geminiModel} onValueChange={(v) => setGeminiModel(v as GeminiModelId)} disabled={running}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">⚡ Автоматичний режим (Рекомендовано)</SelectItem>
                {GEMINI_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.label} — {m.desc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Manual structure checkbox */}
          <label className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
            manualStructure ? "border-primary/40 bg-primary/5" : "border-border hover:bg-secondary/40"
          } ${running ? "opacity-50 pointer-events-none" : ""}`}>
            <input
              type="checkbox"
              checked={manualStructure}
              onChange={(e) => setManualStructure(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
              disabled={running}
            />
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <LayoutList className="h-3.5 w-3.5 text-primary" />
                Ручне налаштування структури
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Кампанія зупиниться перед генерацією ТЗ — покаже Конструктор структури з заголовками конкурентів.
                Ви підтверджуєте → ТЗ будується за вашою структурою.
              </p>
            </div>
          </label>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={runCampaign}
              disabled={running || !keyword.trim()}
              className="bg-hero-gradient border-0 text-white hover:opacity-90 gap-2"
            >
              {running
                ? <><Loader2 className="h-4 w-4 animate-spin" />Виконую кампанію...</>
                : <><Rocket className="h-4 w-4" />Запустити кампанію</>}
            </Button>
            {(done || steps.some((s) => s.status === "error")) && (
              <Button variant="outline" onClick={reset} className="gap-2">Нова кампанія</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stepper progress */}
      {(running || done || steps.some((s) => s.status !== "pending")) && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Прогрес кампанії
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {running && activeModel && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    Використовується: {activeModel}
                  </span>
                )}
                <span className="text-sm text-muted-foreground">{doneCount} / {STEPS.length}</span>
                {done && <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-500/5 text-xs">Завершено</Badge>}
                {waitingForStructure && <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/5 text-xs">Очікування структури</Badge>}
              </div>
            </div>
            <Progress value={progressPct} className="h-1.5 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-2 mb-6 overflow-x-auto pb-2">
              {STEPS.map((step, i) => (
                <div key={step.id} className="flex items-center gap-1 shrink-0">
                  <StepBubble step={step} status={steps[i].status} isCurrent={currentStep === i} />
                  {i < STEPS.length - 1 && (
                    <div className={`hidden sm:block h-0.5 w-8 mt-[-18px] transition-colors ${steps[i].status === "done" ? "bg-green-500" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {STEPS.map((step, i) => {
                const s = steps[i];
                if (s.status === "pending") return null;
                const Icon = step.icon;
                return (
                  <div key={step.id} className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${
                    s.status === "done"    ? "bg-green-500/5 border border-green-500/20"
                    : s.status === "running" ? "bg-primary/5 border border-primary/20"
                    : s.status === "waiting" ? "bg-amber-500/5 border border-amber-500/20"
                    : s.status === "error"   ? "bg-red-500/5 border border-red-500/20"
                    : "bg-secondary/30"}`}>
                    <div className="shrink-0 mt-0.5">
                      {s.status === "running" ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                       : s.status === "done"    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                       : s.status === "waiting" ? <LayoutList className="h-4 w-4 text-amber-500" />
                       : s.status === "error"   ? <XCircle className="h-4 w-4 text-red-500" />
                       : <Icon className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs">{step.label}</p>
                      {s.preview && <p className="text-xs text-muted-foreground mt-0.5">{s.preview}</p>}
                      {s.error && <p className="text-xs text-red-500 mt-0.5">{s.error}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Manual structure pause ─────────────────────────────────────────────── */}
      {waitingForStructure && (
        <Card className="border-amber-500/30 animate-fade-in">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                <LayoutList className="h-5 w-5" />
                Налаштуйте структуру статті
              </CardTitle>
              <Button
                onClick={handleContinueWithStructure}
                className="bg-hero-gradient border-0 text-white hover:opacity-90 gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                {outline.length > 0
                  ? `Продовжити з ${outline.length} заголовками`
                  : "Продовжити без структури (AI обере сам)"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Оберіть заголовки конкурентів або додайте свої. Кампанія відновиться після підтвердження.
            </p>
          </CardHeader>
          <CardContent>
            <OutlineBuilder
              keyword={keyword}
              region="ua"
              initialPages={serpPages.length > 0 ? serpPagesToCompetitors(serpPages) : undefined}
              outline={outline}
              onOutlineChange={setOutline}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Result dashboard ─────────────────────────────────────────────────── */}
      {done && (
        <Card className="animate-fade-in border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Кампанія завершена — всі матеріали готові
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Конкурентів", val: result.serpStats?.successfulScrapes ?? "—" },
                { label: "Сер. слів у ТОП", val: result.serpStats?.avgWords ?? "—" },
                { label: "LSI-слів", val: result.lsiCount ?? "—" },
                {
                  label: "PageSpeed avg",
                  val: result.pagespeedScores
                    ? Math.round(Object.values(result.pagespeedScores).reduce((a, b) => a + b, 0) / 4)
                    : "—",
                },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-center">
                  <p className="text-xl font-bold text-foreground">{item.val}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs with results */}
            <Tabs defaultValue="analysis">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="analysis" className="gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Аналіз та LSI
                </TabsTrigger>
                <TabsTrigger value="brief" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Готове ТЗ
                </TabsTrigger>
                <TabsTrigger value="article" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Стаття
                </TabsTrigger>
              </TabsList>

              {/* Tab: Analysis & LSI */}
              <TabsContent value="analysis" className="mt-4 space-y-4">
                {result.pagespeedScores && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">PageSpeed Scores</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(result.pagespeedScores).map(([key, val]) => {
                        const color = val >= 90 ? "text-green-600 bg-green-500/10 border-green-500/20"
                          : val >= 50 ? "text-orange-500 bg-orange-500/10 border-orange-500/20"
                          : "text-red-500 bg-red-500/10 border-red-500/20";
                        return (
                          <div key={key} className={`rounded-lg border px-3 py-2 text-center ${color}`}>
                            <p className="text-lg font-bold">{val}</p>
                            <p className="text-xs capitalize">{key}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {result.lsiWords && result.lsiWords.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        LSI-слова ({result.lsiWords.length})
                      </p>
                      <Button
                        variant="outline" size="sm"
                        onClick={() => exportCampaignExcel(keyword, result)}
                        className="text-xs gap-1.5 h-7"
                      >
                        <Download className="h-3 w-3" />
                        Excel (.xlsx)
                      </Button>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-secondary">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold border-b border-border">Слово</th>
                            <th className="px-3 py-2 text-left font-semibold border-b border-border whitespace-nowrap">Зустрічається</th>
                            <th className="px-3 py-2 text-left font-semibold border-b border-border whitespace-nowrap">Частота</th>
                            <th className="px-3 py-2 text-left font-semibold border-b border-border whitespace-nowrap">Рекомендовано</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.lsiWords.slice(0, 25).map((w, i) => (
                            <tr key={i} className="border-b border-border even:bg-secondary/40 hover:bg-secondary/60 transition-colors">
                              <td className="px-3 py-1.5 font-medium">{w.word}</td>
                              <td className="px-3 py-1.5 text-muted-foreground">{w.docFreq}</td>
                              <td className="px-3 py-1.5 text-muted-foreground">{w.totalFreq}</td>
                              <td className="px-3 py-1.5 text-primary font-medium">{w.recommended}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {result.lsiWords.length > 25 && (
                        <p className="text-xs text-muted-foreground text-center py-2 border-t border-border">
                          Показано 25 з {result.lsiWords.length} слів — повний список у Excel
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Tab: Brief */}
              <TabsContent value="brief" className="mt-4">
                {result.briefText ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">
                        {result.briefText.split(/\s+/).length} слів
                      </Badge>
                      <Button variant="outline" size="sm" onClick={handleExportBrief} className="text-xs gap-1.5">
                        <Download className="h-3.5 w-3.5" />Завантажити ТЗ у Word (.docx)
                      </Button>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-5 sm:p-8">
                      <MarkdownContent content={result.briefText} />
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-8 text-center">ТЗ ще не згенеровано</p>
                )}
              </TabsContent>

              {/* Tab: Article */}
              <TabsContent value="article" className="mt-4">
                {result.articleText ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs text-purple-500 border-purple-500/30 bg-purple-500/5">
                        {result.articleText.split(/\s+/).length} слів
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWpModalOpen(true)}
                          className={`text-xs gap-1.5 ${getWpSettings(currentUser?.username ?? "") ? "border-[#21759b]/40 text-[#21759b] hover:bg-[#21759b]/10" : ""}`}
                        >
                          <WpIcon className="h-3.5 w-3.5" />
                          {getWpSettings(currentUser?.username ?? "") ? "Опублікувати в WordPress" : "Налаштувати WP"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportArticle} className="text-xs gap-1.5">
                          <Download className="h-3.5 w-3.5" />Word (.docx)
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-5 sm:p-8">
                      <MarkdownContent content={result.articleText} />
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-8 text-center">Стаття ще не згенерована</p>
                )}
              </TabsContent>
            </Tabs>

            {/* Actions panel */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
              <Button onClick={handleExportBrief} variant="outline" className="gap-2" disabled={!result.briefText}>
                <FileText className="h-4 w-4" />ТЗ у Word
              </Button>
              <Button onClick={handleExportArticle} variant="outline" className="gap-2" disabled={!result.articleText}>
                <Sparkles className="h-4 w-4" />Статтю у Word
              </Button>
              <Button onClick={() => exportCampaignExcel(keyword, result)} variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" />Дані в Excel
              </Button>
              {result.articleText && (
                <Button
                  onClick={() => setWpModalOpen(true)}
                  variant="outline"
                  className={`gap-2 ${getWpSettings(currentUser?.username ?? "") ? "border-[#21759b]/50 text-[#21759b] hover:bg-[#21759b]/10" : ""}`}
                >
                  <WpIcon className="h-4 w-4" />
                  {getWpSettings(currentUser?.username ?? "") ? "Опублікувати в WordPress" : "Налаштувати WP"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* WordPress publish modal */}
      {result.articleText && (
        <WordPressModal
          open={wpModalOpen}
          onClose={() => setWpModalOpen(false)}
          content={result.articleText}
        />
      )}
    </div>
  );
};

export default Campaign;
