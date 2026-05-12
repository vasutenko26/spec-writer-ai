import { apiFetch } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Users2, Plus, Trash2, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API = "/api";

interface Report {
  id: number;
  query: string;
  ai_report: string;
  created_at: string;
}

const CompetitorIntel = () => {
  const { id } = useParams<{ id: string }>();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    apiFetch(`${API}/projects/${id}/competitors`)
      .then((r) => r.json())
      .then(setReports)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http")) {
      toast.error("URL має починатися з http:// або https://");
      return;
    }
    if (urls.includes(trimmed)) {
      toast.error("Цей URL вже додано");
      return;
    }
    if (urls.length >= 8) {
      toast.error("Максимум 8 URL");
      return;
    }
    setUrls((prev) => [...prev, trimmed]);
    setUrlInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); addUrl(); }
  };

  const handleAnalyze = async () => {
    if (urls.length === 0) return toast.error("Додайте хоча б один URL");
    if (!query.trim()) return toast.error("Введіть нішу/запит для аналізу");

    setAnalyzing(true);
    try {
      const res = await apiFetch(`${API}/projects/${id}/competitors/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls, query }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const report = await res.json();
      setReports((prev) => [report, ...prev]);
      setExpanded(report.id);
      setUrls([]);
      setQuery("");
      toast.success("Аналіз конкурентів завершено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка аналізу");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (rid: number) => {
    try {
      await apiFetch(`${API}/projects/${id}/competitors/${rid}`, { method: "DELETE" });
      setReports((prev) => prev.filter((r) => r.id !== rid));
      if (expanded === rid) setExpanded(null);
      toast.success("Звіт видалено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">Розвідка конкурентів</h2>
        <p className="text-sm text-muted-foreground">
          Введіть URL конкурентів — система спарсить сторінки і проведе аналіз за фреймворком SEO-Ops + Conversion-Ops
        </p>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-4 w-4 text-violet-500" />
          <span className="font-semibold text-sm">Новий аналіз</span>
          <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-600 bg-violet-500/5">
            SEO-Ops + Conversion-Ops
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Ніша / запит *</label>
            <Input
              placeholder="Наприклад: CRM для малого бізнесу, SaaS для HR, доставка їжі Київ..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              URL конкурентів (до 8 штук)
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="https://competitor.com/page"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button variant="outline" onClick={addUrl} className="shrink-0">
                Додати
              </Button>
            </div>

            {urls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {urls.map((url, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 rounded-lg bg-secondary/60 border border-border px-2.5 py-1 text-xs"
                  >
                    <span className="max-w-[200px] truncate">{url}</span>
                    <button
                      onClick={() => setUrls((prev) => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={analyzing || urls.length === 0 || !query.trim()}
            className="gap-2"
          >
            {analyzing ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Аналізую...</>
            ) : (
              <><Users2 className="h-4 w-4" />Запустити аналіз</>
            )}
          </Button>

          {analyzing && (
            <p className="text-xs text-muted-foreground">
              Парсяться сторінки конкурентів, формується стратегічний звіт (~60 сек)...
            </p>
          )}
        </div>
      </div>

      {/* Reports */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-secondary/40 animate-pulse" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Немає звітів. Додайте URL конкурентів і запустіть аналіз.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="rounded-xl border border-violet-500/20 bg-card overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                  <Users2 className="h-4 w-4 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{report.query}</h4>
                  <p className="text-xs text-muted-foreground">
                    {new Date(report.created_at).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setExpanded(expanded === report.id ? null : report.id)}
                    className="h-8 text-xs gap-1 text-muted-foreground"
                  >
                    {expanded === report.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {expanded === report.id ? "Сховати" : "Звіт"}
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => handleDelete(report.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {expanded === report.id && (
                <div className="border-t border-border px-6 py-5">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.ai_report}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompetitorIntel;
