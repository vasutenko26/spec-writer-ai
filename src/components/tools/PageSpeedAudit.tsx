import { apiFetch } from "@/contexts/AuthContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge, Loader2, X, AlertCircle, AlertTriangle, CheckCircle2, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useAppState, PageSpeedResult } from "@/contexts/AppStateContext";

function exportPagespeedToExcel(result: PageSpeedResult) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Scores
  const scores = XLSX.utils.json_to_sheet([{
    "URL": result.url,
    "Продуктивність": result.scores.performance,
    "Доступність": result.scores.accessibility,
    "Best Practices": result.scores.bestPractices,
    "SEO": result.scores.seo,
    "Середня оцінка": Math.round((result.scores.performance + result.scores.accessibility + result.scores.bestPractices + result.scores.seo) / 4),
  }]);
  scores["!cols"] = [{ wch: 50 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, scores, "Оцінки");

  // Sheet 2: Issues with details
  if (result.issues.length) {
    const issueRows = result.issues.map((iss) => ({
      "Тип": iss.type === "error" ? "Помилка" : "Попередження",
      "Назва": iss.title,
      "Оцінка (0-100)": iss.score,
      "Значення": iss.displayValue,
      "Опис": iss.description,
      "Проблемні елементи": (iss as PageSpeedResult["issues"][0] & { failingItems?: string[] }).failingItems?.join(" | ") || "",
    }));
    const ws2 = XLSX.utils.json_to_sheet(issueRows);
    ws2["!cols"] = [{ wch: 12 }, { wch: 35 }, { wch: 14 }, { wch: 20 }, { wch: 70 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Проблеми");
  }

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), "pagespeed-audit.xlsx");
  toast.success("Excel завантажено");
}

// SVG ring component mimicking Lighthouse UI
const ScoreRing = ({ score, label }: { score: number; label: string }) => {
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? "#22c55e" : score >= 50 ? "#f97316" : "#ef4444";
  const trackColor = score >= 90 ? "#dcfce7" : score >= 50 ? "#ffedd5" : "#fee2e2";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke={trackColor} strokeWidth="7" />
        <circle
          cx="44" cy="44" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x="44" y="48" textAnchor="middle" fontSize="22" fontWeight="700" fill={color} fontFamily="system-ui,sans-serif">
          {score}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground text-center leading-tight max-w-[80px]">{label}</span>
    </div>
  );
};

const scoreLabel = (score: number) =>
  score >= 90 ? "Добре" : score >= 50 ? "Потребує уваги" : "Погано";

const scoreVariant = (score: number): "outline" => "outline";

const scoreBadgeClass = (score: number) =>
  score >= 90
    ? "border-green-500/30 text-green-600 bg-green-500/5"
    : score >= 50
    ? "border-orange-500/30 text-orange-500 bg-orange-500/5"
    : "border-red-500/30 text-red-500 bg-red-500/5";

const PageSpeedAudit = () => {
  const { pagespeedResult, setPagespeedResult } = useAppState();
  const [url, setUrl] = useState(pagespeedResult?.url || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleAudit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const fullUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    setIsLoading(true);
    setPagespeedResult(null);

    try {
      const res = await apiFetch(`/api/pagespeed?url=${encodeURIComponent(fullUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Помилка ${res.status}`);
      const result: PageSpeedResult = { ...data, timestamp: Date.now() };
      setPagespeedResult(result);
      const avg = Math.round(Object.values(data.scores as Record<string, number>).reduce((a, b) => a + b, 0) / 4);
      toast.success(`Аудит завершено · Загальна оцінка: ${avg}/100`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка PageSpeed аудиту");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Технічний SEO-аудит
          </CardTitle>
          <CardDescription>
            Аналізує швидкість, доступність, best practices та SEO через Google PageSpeed Insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="audit-url">URL сторінки</Label>
            <div className="flex gap-2">
              <Input
                id="audit-url"
                placeholder="https://example.com/page"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleAudit()}
                className="flex-1"
              />
              <Button
                onClick={handleAudit}
                disabled={!url.trim() || isLoading}
                className="bg-hero-gradient border-0 text-white hover:opacity-90 shrink-0"
              >
                {isLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Аналізую...</>
                  : <><Gauge className="h-4 w-4 mr-2" />Аудит</>
                }
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Аналіз займає 20–40 секунд (мобільна версія)</p>
          </div>
        </CardContent>
      </Card>

      {pagespeedResult && (
        <div className="space-y-4 animate-fade-in">
          {/* URL header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <a
                href={pagespeedResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1 truncate"
              >
                {pagespeedResult.url}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => exportPagespeedToExcel(pagespeedResult)} className="h-7 text-xs gap-1.5">
                <Download className="h-3 w-3" />Excel
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPagespeedResult(null)} className="h-7 text-xs text-muted-foreground">
                <X className="h-3 w-3 mr-1" />Очистити
              </Button>
            </div>
          </div>

          {/* Score rings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Оцінки Lighthouse (мобільна версія)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 justify-items-center">
                <ScoreRing score={pagespeedResult.scores.performance} label="Продуктивність" />
                <ScoreRing score={pagespeedResult.scores.accessibility} label="Доступність" />
                <ScoreRing score={pagespeedResult.scores.bestPractices} label="Best Practices" />
                <ScoreRing score={pagespeedResult.scores.seo} label="SEO" />
              </div>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["performance", "accessibility", "bestPractices", "seo"] as const).map((key) => {
                  const score = pagespeedResult.scores[key];
                  const labels = { performance: "Продуктивність", accessibility: "Доступність", bestPractices: "Best Practices", seo: "SEO" };
                  return (
                    <div key={key} className="text-center">
                      <Badge variant={scoreVariant(score)} className={`text-xs ${scoreBadgeClass(score)}`}>
                        {scoreLabel(score)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Issues */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {pagespeedResult.issues.length === 0
                  ? <><CheckCircle2 className="h-4 w-4 text-green-500" />Критичних проблем не знайдено</>
                  : <><AlertCircle className="h-4 w-4 text-orange-500" />{pagespeedResult.issues.length} проблем потребують уваги</>
                }
              </CardTitle>
            </CardHeader>
            {pagespeedResult.issues.length > 0 && (
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {pagespeedResult.issues.map((issue) => (
                    <div key={issue.id} className="flex items-start gap-3 px-5 py-3.5">
                      {issue.type === "error"
                        ? <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        : <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{issue.title}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs py-0 h-4 shrink-0 ${
                              issue.type === "error"
                                ? "border-red-500/30 text-red-500 bg-red-500/5"
                                : "border-orange-500/30 text-orange-500 bg-orange-500/5"
                            }`}
                          >
                            {issue.type === "error" ? "Помилка" : "Попередження"}
                          </Badge>
                          {issue.displayValue && (
                            <span className="text-xs text-muted-foreground font-mono">{issue.displayValue}</span>
                          )}
                        </div>
                        {issue.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{issue.description}</p>
                        )}
                        {(issue as PageSpeedResult["issues"][0] & { failingItems?: string[] }).failingItems?.length ? (
                          <div className="mt-1 space-y-0.5">
                            {(issue as PageSpeedResult["issues"][0] & { failingItems?: string[] }).failingItems!.slice(0, 3).map((item, idx) => (
                              <p key={idx} className="text-xs font-mono text-muted-foreground bg-secondary/50 rounded px-1.5 py-0.5 truncate">{item}</p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default PageSpeedAudit;
