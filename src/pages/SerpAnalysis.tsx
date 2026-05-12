import { apiFetch } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Loader2, CheckCircle2, Circle, ArrowRight, X, Globe, Type, Image, LayoutList } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppState, SerpResult } from "@/contexts/AppStateContext";
import { useHistory } from "@/contexts/HistoryContext";

const STEPS = [
  { label: "Запит до SearXNG (ТОП-10)", duration: 2500 },
  { label: "Аналіз сторінок конкурентів", duration: 12000 },
  { label: "AI-аналіз пошукового ландшафту", duration: 0 },
];

const StatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) => (
  <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
      <Icon className="h-4 w-4 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  </div>
);

const SerpAnalysis = () => {
  const navigate = useNavigate();
  const { serpResult, setSerpResult } = useAppState();
  const { addEntry } = useHistory();

  const [keyword, setKeyword] = useState(serpResult?.keyword || "");
  const [region, setRegion] = useState(serpResult?.region || "ua");
  const [language, setLanguage] = useState("uk");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const stepTimers = useRef<NodeJS.Timeout[]>([]);

  const clearStepTimers = () => {
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = [];
  };

  const startProgressSimulation = () => {
    clearStepTimers();
    setCurrentStep(0);
    let elapsed = 0;
    for (let i = 1; i < STEPS.length - 1; i++) {
      elapsed += STEPS[i - 1].duration;
      const t = setTimeout(() => setCurrentStep(i), elapsed);
      stepTimers.current.push(t);
    }
  };

  useEffect(() => () => clearStepTimers(), []);

  const handleAnalyze = async () => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    setSerpResult(null);
    startProgressSimulation();

    try {
      const res = await apiFetch("/api/serp-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), region, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Помилка ${res.status}`);

      clearStepTimers();
      setCurrentStep(2);
      await new Promise((r) => setTimeout(r, 300));

      const result: SerpResult = {
        keyword: keyword.trim(),
        region,
        pages: data.pages,
        scrapedTable: data.scrapedTable,
        headingsDetail: data.headingsDetail,
        aiAnalysis: data.aiAnalysis,
        stats: data.stats,
        timestamp: Date.now(),
      };
      setSerpResult(result);
      addEntry("serp", `${keyword.trim()} — ${data.stats?.successfulScrapes || 0} сторінок`, result);
      toast.success(`Аналіз завершено: ${data.stats?.successfulScrapes || 0} сторінок проаналізовано`);
    } catch (e: unknown) {
      clearStepTimers();
      setCurrentStep(-1);
      toast.error(e instanceof Error ? e.message : "Помилка SERP-аналізу");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout title="SERP-аналіз конкурентів" icon={Search}>
      <div className="space-y-6">
        {/* Input form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4 text-primary" />
              Параметри аналізу
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 space-y-2">
                <Label>Регіон</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ua">Україна</SelectItem>
                    <SelectItem value="us">США</SelectItem>
                    <SelectItem value="eu">Європа</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1 space-y-2">
                <Label>Мова відповіді</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uk">Українська</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kw">Пошуковий запит</Label>
              <div className="flex gap-2">
                <Input
                  id="kw"
                  placeholder="Наприклад: купити ноутбук для роботи"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isLoading && handleAnalyze()}
                  className="flex-1"
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={!keyword.trim() || isLoading}
                  className="bg-hero-gradient border-0 text-white hover:opacity-90 shrink-0"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="ml-2 hidden sm:inline">Аналізувати</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        {isLoading && (
          <Card className="animate-fade-in">
            <CardContent className="pt-6 pb-5">
              <p className="text-sm font-semibold mb-4">Аналіз виконується...</p>
              <div className="space-y-3">
                {STEPS.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {i < currentStep ? (
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    ) : i === currentStep ? (
                      <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={`text-sm ${i <= currentStep ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {serpResult && !isLoading && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold">Результати SERP</h2>
                <p className="text-sm text-muted-foreground">
                  Запит: <span className="font-medium text-foreground">"{serpResult.keyword}"</span>
                  {" "}· {serpResult.region.toUpperCase()}
                  {serpResult.stats && (
                    <> · <span className="text-primary">{serpResult.stats.successfulScrapes}/{serpResult.stats.totalResults} сторінок</span></>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate("/tools/brief")}
                  className="bg-hero-gradient border-0 text-white hover:opacity-90 text-sm"
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  Створити ТЗ
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSerpResult(null)} className="h-8 w-8 text-muted-foreground">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stats */}
            {serpResult.stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Type} label="Сер. слів" value={serpResult.stats.avgWords} color="bg-blue-500" />
                <StatCard icon={LayoutList} label="Сер. H2" value={serpResult.stats.avgH2} color="bg-primary" />
                <StatCard icon={LayoutList} label="Сер. H3" value={serpResult.stats.avgH3} color="bg-purple-500" />
                <StatCard icon={Image} label="Сер. зображень" value={serpResult.stats.avgImages} color="bg-orange-500" />
              </div>
            )}

            {/* Competitor table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  ТОП-10 конкурентів
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="px-3 py-2 text-left font-semibold w-8">#</th>
                        <th className="px-3 py-2 text-left font-semibold">URL</th>
                        <th className="px-3 py-2 text-left font-semibold">Title</th>
                        <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Слів</th>
                        <th className="px-3 py-2 text-right font-semibold">H2</th>
                        <th className="px-3 py-2 text-right font-semibold">H3</th>
                        <th className="px-3 py-2 text-right font-semibold">Imgs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serpResult.pages.map((p, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors even:bg-secondary/10">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 max-w-[180px]">
                            <a href={p.url} target="_blank" rel="noopener noreferrer"
                              className="text-primary hover:underline truncate block max-w-[180px]" title={p.url}>
                              {p.url.replace(/^https?:\/\//, "").slice(0, 40)}
                            </a>
                          </td>
                          <td className="px-3 py-2 max-w-[200px]">
                            <span className="truncate block max-w-[200px]" title={p.title}>{p.title}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {p.wordCount > 0 ? (
                              <Badge variant="outline" className="text-xs font-mono">{p.wordCount.toLocaleString()}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">{p.h2.length || "—"}</td>
                          <td className="px-3 py-2 text-right">{p.h3.length || "—"}</td>
                          <td className="px-3 py-2 text-right">{p.imageCount || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* AI Analysis */}
            {serpResult.aiAnalysis && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    AI-аналіз пошукового ландшафту
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <article className="prose prose-sm max-w-none dark:prose-invert
                    prose-h2:text-base prose-h2:font-semibold prose-h2:mt-5 prose-h2:mb-2
                    prose-p:leading-relaxed prose-li:leading-relaxed prose-strong:text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{serpResult.aiAnalysis}</ReactMarkdown>
                  </article>
                </CardContent>
              </Card>
            )}

            {/* CTA to Brief */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold text-sm">Готові до наступного кроку?</p>
                <p className="text-sm text-muted-foreground">
                  Дані SERP-аналізу будуть автоматично використані при генерації ТЗ
                </p>
              </div>
              <Button
                onClick={() => navigate("/tools/brief")}
                className="bg-hero-gradient border-0 text-white hover:opacity-90"
              >
                <FileText className="h-4 w-4 mr-2" />
                Генерувати ТЗ
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SerpAnalysis;
