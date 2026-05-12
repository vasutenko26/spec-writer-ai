import { apiFetch } from "@/contexts/AuthContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2, Loader2, X, Plus, Trash2, ArrowRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/contexts/AppStateContext";

interface ArticleEntry {
  title: string;
  url: string;
}

const SmartLinking = () => {
  const { linkingResult, setLinkingResult } = useAppState();
  const [articleText, setArticleText] = useState("");
  const [articles, setArticles] = useState<ArticleEntry[]>([
    { title: "", url: "" },
    { title: "", url: "" },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const addArticle = () => setArticles((prev) => [...prev, { title: "", url: "" }]);

  const removeArticle = (i: number) =>
    setArticles((prev) => prev.filter((_, idx) => idx !== i));

  const updateArticle = (i: number, field: keyof ArticleEntry, value: string) =>
    setArticles((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));

  const handleAnalyze = async () => {
    if (!articleText.trim()) {
      toast.error("Вставте текст статті");
      return;
    }
    const validArticles = articles.filter((a) => a.title.trim() && a.url.trim());
    if (validArticles.length === 0) {
      toast.error("Додайте хоча б одну статтю зі заголовком та URL");
      return;
    }

    setIsLoading(true);
    setLinkingResult(null);

    try {
      const res = await apiFetch("/api/smart-linking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleText: articleText.trim(), articles: validArticles }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Помилка ${res.status}`);
      setLinkingResult({ ...data, timestamp: Date.now() });
      toast.success(`Знайдено ${data.suggestions.length} рекомендацій для перелінкування`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка аналізу перелінкування");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Article text */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4 text-primary" />
              Текст статті
            </CardTitle>
            <CardDescription>Вставте текст, для якого потрібно знайти місця для перелінкування</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Вставте текст вашої статті тут..."
              value={articleText}
              onChange={(e) => setArticleText(e.target.value)}
              rows={12}
              className="resize-y text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              {articleText.length > 0 ? `${articleText.length} символів · ${articleText.trim().split(/\s+/).length} слів` : ""}
            </p>
          </CardContent>
        </Card>

        {/* Article list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRight className="h-4 w-4 text-primary" />
              Наявні статті сайту
            </CardTitle>
            <CardDescription>Перелік статей, на які можна поставити посилання</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {articles.map((article, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Input
                      placeholder={`Заголовок статті ${i + 1}`}
                      value={article.title}
                      onChange={(e) => updateArticle(i, "title", e.target.value)}
                      className="text-sm h-8"
                    />
                    <Input
                      placeholder="https://example.com/article"
                      value={article.url}
                      onChange={(e) => updateArticle(i, "url", e.target.value)}
                      className="text-sm h-8 font-mono"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeArticle(i)}
                    className="h-8 w-8 p-0 mt-0.5 text-muted-foreground hover:text-destructive shrink-0"
                    disabled={articles.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addArticle}
              className="w-full gap-1.5 text-xs"
              disabled={articles.length >= 20}
            >
              <Plus className="h-3.5 w-3.5" />
              Додати статтю
            </Button>
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={handleAnalyze}
        disabled={!articleText.trim() || isLoading}
        className="bg-hero-gradient border-0 text-white hover:opacity-90 w-full sm:w-auto"
      >
        {isLoading
          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />AI аналізує текст...</>
          : <><Link2 className="mr-2 h-4 w-4" />Знайти місця для перелінкування</>
        }
      </Button>

      {/* Results */}
      {linkingResult && (
        <Card className="animate-fade-in">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4 text-primary" />
                Рекомендації для перелінкування
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                  {linkingResult.suggestions.length} місць
                </Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLinkingResult(null)} className="h-7 text-xs text-muted-foreground">
                <X className="h-3 w-3 mr-1" />Очистити
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-2.5 text-left font-semibold text-xs">Де поставити</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Анкор</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Куди посилатись</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-xs">Обґрунтування</th>
                  </tr>
                </thead>
                <tbody>
                  {linkingResult.suggestions.map((s, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors even:bg-secondary/10 align-top">
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3" title={s.location}>
                          "…{s.location}…"
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5 font-medium">
                          {s.anchor}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium">{s.targetTitle}</p>
                          <a
                            href={s.targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-0.5"
                          >
                            {s.targetUrl.replace(/^https?:\/\//, "").slice(0, 40)}
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-xs text-muted-foreground leading-relaxed">{s.reason}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartLinking;
