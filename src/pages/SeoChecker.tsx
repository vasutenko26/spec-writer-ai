import { apiFetch } from "@/contexts/AuthContext";
import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Loader2, Sparkles, X, Type, Hash, AlignLeft, List, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppState } from "@/contexts/AppStateContext";

// ── Client-side text analysis ─────────────────────────────────────────────────

interface KeywordStat {
  keyword: string;
  count: number;
  density: string;
}

interface TextStats {
  wordCount: number;
  charCount: number;
  charNoSpaces: number;
  h1: number;
  h2: number;
  h3: number;
  paragraphs: number;
  lists: number;
  avgSentenceLength: number;
  keywordStats: KeywordStat[];
}

function analyzeText(content: string, keywordsRaw: string): TextStats {
  const words = content.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = content.length;
  const charNoSpaces = content.replace(/\s/g, "").length;

  const h1 = (content.match(/^# [^\n]+/gm) || []).length;
  const h2 = (content.match(/^## [^\n]+/gm) || []).length;
  const h3 = (content.match(/^### [^\n]+/gm) || []).length;
  const paragraphs = content.split(/\n{2,}/).filter((p) => p.trim().length > 20).length;
  const lists = (content.match(/^[-*+•] .+/gm) || []).length;

  const sentences = content.split(/[.!?]+\s+/).filter((s) => s.trim().length > 5);
  const avgSentenceLength = sentences.length > 0 ? Math.round(wordCount / sentences.length) : 0;

  const keywords = keywordsRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const keywordStats: KeywordStat[] = keywords.map((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const count = (content.match(new RegExp(escaped, "gi")) || []).length;
    const density = wordCount > 0 ? ((count / wordCount) * 100).toFixed(2) : "0.00";
    return { keyword: kw, count, density };
  });

  return { wordCount, charCount, charNoSpaces, h1, h2, h3, paragraphs, lists, avgSentenceLength, keywordStats };
}

// ── Density badge ─────────────────────────────────────────────────────────────

const DensityBadge = ({ density }: { density: string }) => {
  const val = parseFloat(density);
  if (val === 0) return <Badge variant="secondary" className="text-xs">0%</Badge>;
  if (val < 0.5) return <Badge variant="outline" className="text-xs text-muted-foreground">{density}%</Badge>;
  if (val <= 2.5) return <Badge className="text-xs bg-primary/15 text-primary border-primary/30">{density}% ✓</Badge>;
  if (val <= 4) return <Badge className="text-xs bg-orange-500/15 text-orange-600 border-orange-300">{density}% ⚠</Badge>;
  return <Badge variant="destructive" className="text-xs">{density}% ✗</Badge>;
};

// ── StatCard ──────────────────────────────────────────────────────────────────

const StatItem = ({ label, value, note }: { label: string; value: string | number; note?: string }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const SeoChecker = () => {
  const { seoResult, setSeoResult } = useAppState();

  const [content, setContent] = useState("");
  const [keywordsRaw, setKeywordsRaw] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const stats = useMemo<TextStats | null>(() => {
    if (!content.trim()) return null;
    return analyzeText(content, keywordsRaw);
  }, [content, keywordsRaw]);

  const handleCheck = async () => {
    if (!content.trim()) return;
    setIsLoading(true);
    setSeoResult(null);

    try {
      const keywords = keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean);
      const res = await apiFetch("/api/seo-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, keywords, stats }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Помилка ${res.status}`);
      setSeoResult(data.analysis);
      toast.success("AI-аналіз готовий");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка аналізу");
    } finally {
      setIsLoading(false);
    }
  };

  const hasEnoughContent = content.trim().split(/\s+/).length >= 50;

  return (
    <AppLayout title="SEO-перевірки" icon={BarChart3}>
      <div className="space-y-6">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Текст для аналізу
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">Вставте текст (Markdown або звичайний)</Label>
              <Textarea
                id="content"
                placeholder="Вставте сюди готовий текст або статтю для перевірки..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="font-mono text-xs leading-relaxed resize-none"
              />
              {content && (
                <p className="text-xs text-muted-foreground text-right">
                  {stats?.wordCount.toLocaleString() || 0} слів · {stats?.charCount.toLocaleString() || 0} символів
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kws">Ключові слова (через кому)</Label>
              <Input
                id="kws"
                placeholder="ноутбук для роботи, купити ноутбук"
                value={keywordsRaw}
                onChange={(e) => setKeywordsRaw(e.target.value)}
              />
            </div>

            {!hasEnoughContent && content.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg bg-secondary/50 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Для AI-аналізу потрібно мінімум 50 слів
              </div>
            )}

            <Button
              onClick={handleCheck}
              disabled={!hasEnoughContent || isLoading}
              className="w-full bg-hero-gradient border-0 text-white hover:opacity-90"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />AI аналізує...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" />Запустити SEO-аналіз</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Live stats */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 animate-fade-in">
            {/* Text metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Type className="h-4 w-4 text-primary" />
                  Параметри тексту
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StatItem label="Слів" value={stats.wordCount.toLocaleString()} />
                <StatItem label="Символів (з пробілами)" value={stats.charCount.toLocaleString()} />
                <StatItem label="Символів (без пробілів)" value={stats.charNoSpaces.toLocaleString()} />
                <StatItem label="Сер. довж. речення" value={`${stats.avgSentenceLength} слів`}
                  note={stats.avgSentenceLength > 25 ? "⚠ довго" : stats.avgSentenceLength < 8 ? "⚠ коротко" : "✓"} />
                <StatItem label="Абзаців" value={stats.paragraphs} />
                <StatItem label="Пунктів списків" value={stats.lists} />
              </CardContent>
            </Card>

            {/* Structure */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" />
                  Структура заголовків
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StatItem label="H1" value={stats.h1}
                  note={stats.h1 === 0 ? "⚠ відсутній" : stats.h1 > 1 ? "⚠ забагато" : "✓"} />
                <StatItem label="H2" value={stats.h2}
                  note={stats.h2 < 3 ? "⚠ мало" : stats.h2 <= 10 ? "✓" : "⚠ багато"} />
                <StatItem label="H3" value={stats.h3} />

                {stats.keywordStats.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <AlignLeft className="h-3 w-3" /> Щільність ключових слів
                    </p>
                    <div className="space-y-1.5">
                      {stats.keywordStats.map((k) => (
                        <div key={k.keyword} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground truncate max-w-[55%]" title={k.keyword}>
                            "{k.keyword}"
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs tabular-nums text-muted-foreground">{k.count}×</span>
                            <DensityBadge density={k.density} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Оптимально: 1.5–2.5%</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Analysis */}
        {seoResult && (
          <Card className="animate-fade-in">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI-аналіз якості контенту
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setSeoResult(null)} className="h-7 w-7 text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <article className="prose prose-sm max-w-none dark:prose-invert
                prose-h2:text-base prose-h2:font-semibold prose-h2:mt-5 prose-h2:mb-2 prose-h2:border-0
                prose-p:leading-relaxed prose-li:leading-relaxed prose-strong:text-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{seoResult}</ReactMarkdown>
              </article>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default SeoChecker;
