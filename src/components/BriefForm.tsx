import { apiFetch } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search, FileText, Loader2, Database, X, Archive,
  ChevronDown, Users, Check, Plus, Sparkles, HelpCircle, Zap, Link2, StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { GEMINI_MODELS, callWithModelFallback, type GeminiModelId } from "@/lib/geminiFallback";
import { useAppState } from "@/contexts/AppStateContext";
import { useHistory } from "@/contexts/HistoryContext";
import BriefResult from "./BriefResult";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompetitorRow {
  position: number;
  url: string;
  title: string;
  wordCount: number;
  h2Count: number;
  h3Count: number;
  imageCount: number;
}

type HeadingItem = { tag: string; text: string };
type HeadingTab = "competitors" | "ai" | "manual";

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeHostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

// ── Component ─────────────────────────────────────────────────────────────────

const BriefForm = () => {
  const { serpResult, briefResult, setBriefResult } = useAppState();
  const { addEntry } = useHistory();

  // ── Core form state ──────────────────────────────────────────────────────
  const [keyword, setKeyword] = useState(serpResult?.keyword || "");
  const [language, setLanguage] = useState("uk");
  const [region, setRegion] = useState(serpResult?.region || "ua");
  const [contentType, setContentType] = useState("article");
  const [isLoading, setIsLoading] = useState(false);
  const [geminiModel, setGeminiModel] = useState<GeminiModelId>("auto");
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [useSerpData, setUseSerpData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedBriefId, setSavedBriefId] = useState<number | null>(null);

  useEffect(() => {
    if (serpResult?.keyword && !keyword) setKeyword(serpResult.keyword);
  }, [serpResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const canUseSerpData =
    serpResult && useSerpData &&
    serpResult.keyword.toLowerCase() === keyword.toLowerCase().trim();

  // ── Competitors state ────────────────────────────────────────────────────
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);
  const [selectedCompetitors, setSelectedCompetitors] = useState<Set<number>>(new Set());
  const [competitorsOpen, setCompetitorsOpen] = useState(false);

  // ── Headings state ───────────────────────────────────────────────────────
  const [headingTab, setHeadingTab] = useState<HeadingTab>("competitors");
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [headingsOpen, setHeadingsOpen] = useState(false);
  const [loadingHeadings, setLoadingHeadings] = useState(false);
  const [generatingHeadings, setGeneratingHeadings] = useState(false);
  const [manualTag, setManualTag] = useState("H2");
  const [manualText, setManualText] = useState("");

  // ── Meta state ───────────────────────────────────────────────────────────
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [generatingMeta, setGeneratingMeta] = useState(false);

  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [questions, setQuestions] = useState<{ text: string; type: string }[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());

  const [linkingOpen, setLinkingOpen] = useState(false);
  const [internalLinks, setInternalLinks] = useState<string[]>([""]);
  const [externalLinks, setExternalLinks] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    setActiveModel(null);
    setBriefResult(null);
    setSavedBriefId(null);

    try {
      const body: Record<string, unknown> = {
        keyword: keyword.trim(), language, region, contentType,
      };
      if (canUseSerpData) body.serpData = serpResult!.pages;
      if (headings.length > 0) body.customStructure = headings;
      const selectedUrls = competitors
        .filter((c) => selectedCompetitors.has(c.position))
        .map((c) => c.url);
      if (selectedUrls.length > 0) body.selectedUrls = selectedUrls;
      if (metaTitle.trim()) {
        body.metaTitle = metaTitle;
        body.metaDescription = metaDescription;
        body.slug = slug;
      }
      const selectedQs = questions
        .filter((_, i) => selectedQuestions.has(i))
        .map((q) => q.text);
      if (selectedQs.length > 0) body.questions = selectedQs;
      body.internalLinks = internalLinks.filter((l) => l.trim());
      body.externalLinks = externalLinks.filter((l) => l.trim());
      if (notes.trim()) body.notes = notes.trim();

      const { data } = await callWithModelFallback(
        "/api/generate-brief",
        body as Record<string, unknown>,
        geminiModel,
        (_id, label) => setActiveModel(label),
      );

      setBriefResult(data.content);
      setActiveModel(GEMINI_MODELS.find((m) => m.id === data.modelUsed)?.label ?? data.modelUsed ?? null);
      addEntry(
        "brief",
        `ТЗ для «${keyword.trim()}»: ${(data.content as string).slice(0, 120).replace(/\n/g, " ")}…`,
        data.content,
      );
      if (data.usedPreFetched) toast.success("ТЗ створено з використанням даних SERP-аналізу");
      if (headings.length > 0) toast.success(`Структуру з ${headings.length} заголовків передано до ТЗ`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка генерації ТЗ");
    } finally {
      setIsLoading(false);
    }
  };

  const generateQuestions = async () => {
    if (!keyword.trim()) return;
    setLoadingQuestions(true);
    try {
      const competitorHeadings = competitors
        .filter((c) => selectedCompetitors.has(c.position))
        .flatMap((c) => [c.title])
        .filter(Boolean);
      const res = await apiFetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, language, contentType, competitorHeadings }),
      });
      const data = await res.json();
      const qs: { text: string; type: string }[] = data.questions || [];
      setQuestions(qs);
      setSelectedQuestions(new Set(qs.map((_, i) => i)));
      setQuestionsOpen(true);
      toast.success(`Згенеровано ${qs.length} питань`);
    } catch {
      toast.error("Помилка генерації питань");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const loadCompetitors = async () => {
    if (!keyword.trim()) return;
    setLoadingCompetitors(true);
    setCompetitors([]);
    try {
      const res = await apiFetch("/api/serp-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), region, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка");

      const rows: CompetitorRow[] = (data.pages || []).map((r: {
        position?: number; url?: string; title?: string;
        wordCount?: number; h2?: string[]; h3?: string[]; imageCount?: number;
      }) => ({
        position: r.position ?? 0,
        url: r.url ?? "",
        title: r.title ?? r.url ?? "",
        wordCount: r.wordCount ?? 0,
        h2Count: r.h2?.length ?? 0,
        h3Count: r.h3?.length ?? 0,
        imageCount: r.imageCount ?? 0,
      }));

      setCompetitors(rows);
      setCompetitorsOpen(true);
      setSelectedCompetitors(new Set(rows.slice(0, 5).map((r) => r.position)));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка завантаження конкурентів");
    } finally {
      setLoadingCompetitors(false);
    }
  };

  const toggleCompetitor = (position: number) => {
    setSelectedCompetitors((prev) => {
      const next = new Set(prev);
      next.has(position) ? next.delete(position) : next.add(position);
      return next;
    });
  };

  const loadHeadings = async () => {
    if (!keyword.trim()) return;
    setLoadingHeadings(true);
    try {
      const res = await apiFetch("/api/fetch-competitor-headings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), region }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка");

      const collected: HeadingItem[] = [];
      const seen = new Set<string>();
      for (const page of (data.pages ?? []) as { headings?: HeadingItem[] }[]) {
        for (const h of page.headings ?? []) {
          if ((h.tag === "H2" || h.tag === "H3") && !seen.has(h.text.toLowerCase())) {
            seen.add(h.text.toLowerCase());
            collected.push({ tag: h.tag, text: h.text });
          }
        }
      }

      if (collected.length === 0) {
        toast.error("Заголовки не знайдено — спробуйте інший запит");
      } else {
        setHeadings(collected.slice(0, 30));
        toast.success(`Зібрано ${Math.min(collected.length, 30)} заголовків`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка збору заголовків");
    } finally {
      setLoadingHeadings(false);
    }
  };

  const generateHeadings = async () => {
    if (!keyword.trim()) return;
    setGeneratingHeadings(true);
    try {
      const res = await apiFetch("/api/generate-headings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), language, contentType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка");
      if (Array.isArray(data.headings)) {
        setHeadings(data.headings);
        toast.success(`Згенеровано ${data.headings.length} заголовків`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка генерації структури");
    } finally {
      setGeneratingHeadings(false);
    }
  };

  const addManualHeading = () => {
    if (!manualText.trim()) return;
    setHeadings((prev) => [...prev, { tag: manualTag, text: manualText.trim() }]);
    setManualText("");
  };

  const removeHeading = (i: number) => setHeadings((prev) => prev.filter((_, j) => j !== i));

  const generateMeta = async () => {
    if (!keyword.trim()) return;
    setGeneratingMeta(true);
    try {
      const res = await apiFetch("/api/generate-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка");
      setMetaTitle(data.title ?? "");
      setMetaDescription(data.description ?? "");
      setSlug(data.slug ?? "");
      if (!metaOpen) setMetaOpen(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка генерації мета тегів");
    } finally {
      setGeneratingMeta(false);
    }
  };

  const saveBrief = async () => {
    if (!briefResult) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: keyword.trim() || "Без назви",
          keyword: keyword.trim() || null,
          language: language || null,
          region: region || null,
          content_json: JSON.stringify({ content: briefResult, keyword, language, region, contentType }),
          notes: notes.trim() || null,
          project_id: null,
          folder_id: null,
        }),
      });
      if (!res.ok) throw new Error("Помилка збереження");
      const data = await res.json();
      setSavedBriefId(data.id);
      toast.success("ТЗ збережено в «Мій контент»");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* SERP data banner */}
      {serpResult && (
        <div className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
          canUseSerpData
            ? "border-primary/30 bg-primary/5 text-primary"
            : "border-border bg-secondary/50 text-muted-foreground"
        }`}>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 shrink-0" />
            <span>
              {canUseSerpData
                ? `SERP-дані для "${serpResult.keyword}" будуть використані (${serpResult.stats?.successfulScrapes || 0} сторінок)`
                : `Є SERP-дані для "${serpResult.keyword}". Введіть той самий запит, щоб використати їх.`}
            </span>
          </div>
          <button
            onClick={() => setUseSerpData((v) => !v)}
            className="ml-2 shrink-0 text-xs underline opacity-70 hover:opacity-100"
          >
            {useSerpData ? "Не використовувати" : "Використати"}
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Параметри для аналізу
          </CardTitle>
          <CardDescription>
            Введіть ключове слово та параметри для створення ТЗ на основі AI-аналізу
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Keyword */}
          <div className="space-y-2">
            <Label htmlFor="keyword">Ключове слово / тема</Label>
            <Input
              id="keyword"
              placeholder="Наприклад: як вибрати ноутбук для роботи"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          {/* Language / Region / ContentType / Model */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Мова контенту</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="uk">🇺🇦 Українська</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="ru">🇷🇺 Русский</SelectItem>
                  <SelectItem value="pl">🇵🇱 Polski</SelectItem>
                  <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                  <SelectItem value="it">🇮🇹 Italiano</SelectItem>
                  <SelectItem value="cs">🇨🇿 Čeština</SelectItem>
                  <SelectItem value="ro">🇷🇴 Română</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Регіон</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ua">🇺🇦 Україна</SelectItem>
                  <SelectItem value="us">🇺🇸 США</SelectItem>
                  <SelectItem value="gb">🇬🇧 Велика Британія</SelectItem>
                  <SelectItem value="eu">🌍 Європа (загальний)</SelectItem>
                  <SelectItem value="pl">🇵🇱 Польща</SelectItem>
                  <SelectItem value="de">🇩🇪 Німеччина</SelectItem>
                  <SelectItem value="fr">🇫🇷 Франція</SelectItem>
                  <SelectItem value="es">🇪🇸 Іспанія</SelectItem>
                  <SelectItem value="it">🇮🇹 Італія</SelectItem>
                  <SelectItem value="cz">🇨🇿 Чехія</SelectItem>
                  <SelectItem value="ro">🇷🇴 Румунія</SelectItem>
                  <SelectItem value="ca">🇨🇦 Канада</SelectItem>
                  <SelectItem value="au">🇦🇺 Австралія</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Тип контенту</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Стаття</SelectItem>
                  <SelectItem value="landing">Лендінг</SelectItem>
                  <SelectItem value="product">Картка товару</SelectItem>
                  <SelectItem value="category">Категорія</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Модель Gemini</Label>
              <Select value={geminiModel} onValueChange={(v) => setGeminiModel(v as GeminiModelId)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">⚡ Автоматичний режим</SelectItem>
                  {GEMINI_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label} — {m.desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Competitors section ── */}
          <div className="border rounded-xl overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
              onClick={() => setCompetitorsOpen((o) => !o)}
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-500" />
                Аналіз конкурентів
                {competitors.length > 0 && (
                  <Badge variant="outline" className="text-xs">{competitors.length} сайтів</Badge>
                )}
                {selectedCompetitors.size > 0 && (
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-400/30 bg-emerald-500/5">
                    {selectedCompetitors.size} обрано
                  </Badge>
                )}
              </span>
              <div className="flex items-center gap-2">
                {competitors.length === 0 && (
                  <Button
                    size="sm" variant="outline"
                    onClick={(e) => { e.stopPropagation(); loadCompetitors(); }}
                    disabled={loadingCompetitors || !keyword.trim()}
                  >
                    {loadingCompetitors
                      ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Завантаження...</>
                      : "Завантажити конкурентів"}
                  </Button>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${competitorsOpen ? "rotate-180" : ""}`} />
              </div>
            </button>

            {competitorsOpen && competitors.length > 0 && (
              <div className="px-4 pb-4 border-t">
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 w-6">#</th>
                        <th className="text-left py-2">Сайт</th>
                        <th className="text-right py-2">Слів</th>
                        <th className="text-right py-2">H2</th>
                        <th className="text-right py-2">H3</th>
                        <th className="text-right py-2">Фото</th>
                        <th className="text-right py-2">DR</th>
                        <th className="text-center py-2 w-6">✓</th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitors.map((c) => (
                        <tr
                          key={c.position}
                          className={`border-b hover:bg-muted/20 cursor-pointer transition-colors ${
                            selectedCompetitors.has(c.position) ? "bg-emerald-500/5" : ""
                          }`}
                          onClick={() => toggleCompetitor(c.position)}
                        >
                          <td className="py-2 text-muted-foreground">{c.position}</td>
                          <td className="py-2 max-w-[180px]">
                            <div className="font-medium truncate">{c.title}</div>
                            <div className="text-muted-foreground truncate">{safeHostname(c.url)}</div>
                          </td>
                          <td className="py-2 text-right">{c.wordCount.toLocaleString()}</td>
                          <td className="py-2 text-right">{c.h2Count}</td>
                          <td className="py-2 text-right">{c.h3Count}</td>
                          <td className="py-2 text-right">{c.imageCount}</td>
                          <td className="py-2 text-right text-muted-foreground">—</td>
                          <td className="py-2 text-center">
                            {selectedCompetitors.has(c.position) && (
                              <Check className="h-3 w-3 text-emerald-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <Button
                    size="sm" variant="outline" className="flex-1"
                    onClick={loadCompetitors} disabled={loadingCompetitors}
                  >
                    {loadingCompetitors ? "Оновлення..." : "Оновити"}
                  </Button>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {selectedCompetitors.size} із {competitors.length} обрано
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Heading structure section ── */}
          <div className="border rounded-xl overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
              onClick={() => setHeadingsOpen((o) => !o)}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Структура заголовків
                {headings.length > 0 && (
                  <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">
                    {headings.length} заголовків
                  </Badge>
                )}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${headingsOpen ? "rotate-180" : ""}`} />
            </button>

            {headingsOpen && (
              <div className="px-4 pb-4 border-t pt-3">
                <Tabs value={headingTab} onValueChange={(v) => setHeadingTab(v as HeadingTab)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="competitors" className="flex-1 text-xs">З конкурентів</TabsTrigger>
                    <TabsTrigger value="ai" className="flex-1 text-xs">AI структура</TabsTrigger>
                    <TabsTrigger value="manual" className="flex-1 text-xs">Вручну</TabsTrigger>
                  </TabsList>

                  <TabsContent value="competitors" className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Збирає заголовки H2/H3 з ТОП-10 конкурентів за вашим запитом
                    </p>
                    <Button
                      size="sm" variant="outline" className="w-full"
                      onClick={loadHeadings} disabled={loadingHeadings || !keyword.trim()}
                    >
                      {loadingHeadings
                        ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Збираємо заголовки...</>
                        : "Зібрати заголовки конкурентів"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="ai" className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      AI згенерує оптимальну структуру H1–H3 на основі ключового слова та типу контенту
                    </p>
                    <Button
                      size="sm" variant="outline" className="w-full"
                      onClick={generateHeadings} disabled={generatingHeadings || !keyword.trim()}
                    >
                      {generatingHeadings
                        ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Генерація структури...</>
                        : <><Sparkles className="h-3 w-3 mr-1" />Згенерувати структуру</>}
                    </Button>
                  </TabsContent>

                  <TabsContent value="manual" className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <Select value={manualTag} onValueChange={setManualTag}>
                        <SelectTrigger className="w-20 shrink-0"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="H1">H1</SelectItem>
                          <SelectItem value="H2">H2</SelectItem>
                          <SelectItem value="H3">H3</SelectItem>
                          <SelectItem value="H4">H4</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Текст заголовку"
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addManualHeading()}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={addManualHeading} disabled={!manualText.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Shared headings list */}
                {headings.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
                    {headings.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded border bg-muted/10 group">
                        <Badge variant="outline" className="text-[10px] w-8 text-center flex-shrink-0 px-0">
                          {h.tag}
                        </Badge>
                        <span className="flex-1 text-sm truncate">{h.text}</span>
                        <button
                          type="button"
                          onClick={() => removeHeading(i)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setHeadings([])}
                      className="w-full text-xs text-muted-foreground hover:text-destructive py-1 transition-colors"
                    >
                      Очистити всі
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Meta tags section ── */}
          <div className="border rounded-xl overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
              onClick={() => setMetaOpen((o) => !o)}
            >
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4 text-violet-500" />
                Мета теги та slug
                {(metaTitle || slug) && (
                  <Badge variant="outline" className="text-xs text-violet-600 border-violet-400/30 bg-violet-500/5">
                    Заповнено
                  </Badge>
                )}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm" variant="outline"
                  onClick={(e) => { e.stopPropagation(); generateMeta(); }}
                  disabled={generatingMeta || !keyword.trim()}
                  className="h-7 text-xs gap-1"
                >
                  {generatingMeta
                    ? <><Loader2 className="h-3 w-3 animate-spin" />...</>
                    : <><Sparkles className="h-3 w-3" />Авто</>}
                </Button>
                <ChevronDown className={`h-4 w-4 transition-transform ${metaOpen ? "rotate-180" : ""}`} />
              </div>
            </button>

            {metaOpen && (
              <div className="px-4 pb-4 border-t pt-3 space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Title</span>
                    <span className={metaTitle.length > 70 ? "text-destructive font-medium" : ""}>
                      {metaTitle.length}/70
                    </span>
                  </div>
                  <Input
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="Ключове слово на початку | Назва бренду"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Description</span>
                    <span className={metaDescription.length > 160 ? "text-destructive font-medium" : ""}>
                      {metaDescription.length}/160
                    </span>
                  </div>
                  <Textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="До 160 символів з емодзі 🎯"
                    rows={2}
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Slug (URL)</div>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="keyword-in-url-format"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Questions section */}
          <div className="border rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
              onClick={() => setQuestionsOpen((o) => !o)}
              type="button"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-500" />
                Питання користувачів (FAQ)
                {questions.length > 0 && (
                  <Badge variant="outline" className="text-xs">{selectedQuestions.size}/{questions.length} обрано</Badge>
                )}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); generateQuestions(); }}
                  disabled={loadingQuestions || !keyword.trim()}
                >
                  {loadingQuestions ? "Генерація..." : questions.length > 0 ? "Оновити" : "Згенерувати питання"}
                </Button>
                <ChevronDown className={`w-4 h-4 transition-transform ${questionsOpen ? "rotate-180" : ""}`} />
              </div>
            </button>
            {questionsOpen && questions.length > 0 && (
              <div className="p-4 border-t space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Оберіть питання для FAQ в ТЗ</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" type="button"
                      onClick={() => setSelectedQuestions(new Set(questions.map((_, i) => i)))}>
                      Всі
                    </Button>
                    <Button size="sm" variant="outline" type="button"
                      onClick={() => setSelectedQuestions(new Set())}>
                      Скинути
                    </Button>
                  </div>
                </div>
                {questions.map((q, i) => {
                  const typeColors: Record<string, string> = {
                    what:    "bg-blue-500/10 text-blue-600 border-blue-500/20",
                    how:     "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                    why:     "bg-purple-500/10 text-purple-600 border-purple-500/20",
                    where:   "bg-orange-500/10 text-orange-600 border-orange-500/20",
                    when:    "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
                    price:   "bg-pink-500/10 text-pink-600 border-pink-500/20",
                    compare: "bg-slate-500/10 text-slate-600 border-slate-500/20",
                  };
                  const isSelected = selectedQuestions.has(i);
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedQuestions((prev) => {
                        const next = new Set(prev);
                        next.has(i) ? next.delete(i) : next.add(i);
                        return next;
                      })}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                        ${isSelected ? "border-blue-500/30 bg-blue-500/5" : "border-border hover:bg-muted/20"}`}
                    >
                      <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0
                        ${isSelected ? "bg-blue-500 border-blue-500" : "border-muted-foreground/40"}`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm flex-1">{q.text}</span>
                      {q.type && (
                        <Badge variant="outline" className={`text-xs shrink-0 ${typeColors[q.type] || ""}`}>
                          {q.type}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Linking section */}
          <div className="border rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
              onClick={() => setLinkingOpen((o) => !o)}
              type="button"
            >
              <span className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-orange-500" />
                Перелінковка
                {(internalLinks.filter((l) => l.trim()).length > 0 || externalLinks.filter((l) => l.trim()).length > 0) && (
                  <Badge variant="outline" className="text-xs">
                    {internalLinks.filter((l) => l.trim()).length + externalLinks.filter((l) => l.trim()).length} посилань
                  </Badge>
                )}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${linkingOpen ? "rotate-180" : ""}`} />
            </button>
            {linkingOpen && (
              <div className="p-4 border-t space-y-4">
                {/* Internal links */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Внутрішні посилання (сторінки вашого сайту)
                    </label>
                    <Button size="sm" variant="outline" type="button"
                      onClick={() => setInternalLinks((prev) => [...prev, ""])}>
                      <Plus className="w-3 h-3 mr-1" />Додати
                    </Button>
                  </div>
                  {internalLinks.map((url, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="https://yoursite.com/relevant-page"
                        value={url}
                        onChange={(e) => setInternalLinks((prev) => prev.map((u, j) => j === i ? e.target.value : u))}
                        className="text-sm"
                      />
                      {internalLinks.length > 1 && (
                        <Button size="sm" variant="ghost" type="button"
                          onClick={() => setInternalLinks((prev) => prev.filter((_, j) => j !== i))}
                          className="shrink-0 text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {/* External links */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Зовнішні авторитетні джерела
                    </label>
                    <Button size="sm" variant="outline" type="button"
                      onClick={() => setExternalLinks((prev) => [...prev, ""])}>
                      <Plus className="w-3 h-3 mr-1" />Додати
                    </Button>
                  </div>
                  {externalLinks.map((url, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="https://authoritative-source.com/article"
                        value={url}
                        onChange={(e) => setExternalLinks((prev) => prev.map((u, j) => j === i ? e.target.value : u))}
                        className="text-sm"
                      />
                      {externalLinks.length > 1 && (
                        <Button size="sm" variant="ghost" type="button"
                          onClick={() => setExternalLinks((prev) => prev.filter((_, j) => j !== i))}
                          className="shrink-0 text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Вікіпедія, наукові статті, держ. сайти — підвищують E-E-A-T
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-muted-foreground" />
              Нотатки / Додаткові вимоги
            </label>
            <Textarea
              placeholder="Додаткові вимоги до статті, побажання щодо стилю, обмеження, специфіка ніші..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={!keyword.trim() || isLoading}
            className="w-full bg-hero-gradient border-0 text-primary-foreground hover:opacity-90"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Генерація ТЗ...</span>
                {activeModel && (
                  <span className="text-xs opacity-75 flex items-center gap-1">
                    <Zap className="h-3 w-3" />{activeModel}
                  </span>
                )}
              </div>
            ) : headings.length > 0 ? (
              <><FileText className="mr-2 h-4 w-4" />Створити ТЗ за моєю структурою ({headings.length} заг.)</>
            ) : (
              <><FileText className="mr-2 h-4 w-4" />Створити ТЗ</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Brief result */}
      {briefResult && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">
              Результат збережено
            </Badge>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={saveBrief}
                disabled={saving || !!savedBriefId}
                className="h-7 text-xs gap-1"
              >
                <Archive className="h-3 w-3" />
                {savedBriefId ? "✓ Збережено" : saving ? "Збереження..." : "Зберегти в Мій контент"}
              </Button>
              <Button
                variant="ghost" size="sm"
                onClick={() => setBriefResult(null)}
                className="h-7 text-xs text-muted-foreground"
              >
                <X className="h-3 w-3 mr-1" />Очистити
              </Button>
            </div>
          </div>
          <BriefResult content={briefResult} />
        </div>
      )}
    </div>
  );
};

export default BriefForm;
