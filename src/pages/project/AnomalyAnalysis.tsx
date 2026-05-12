import { apiFetch } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BarChart3, Plus, ChevronDown, ChevronUp, Trash2, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API = "/api";

interface Hypothesis {
  id: number;
  title: string;
  status: string;
}

interface AnomalyRecord {
  id: number;
  hypothesis_title: string;
  outcome: "success" | "failure" | "partial";
  description: string;
  ai_conclusion: string;
  created_at: string;
}

const outcomeConfig = {
  success: { label: "Успіх", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  failure: { label: "Провал", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30" },
  partial: { label: "Частковий успіх", icon: Minus, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" },
};

const AnomalyAnalysis = () => {
  const { id } = useParams<{ id: string }>();
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([]);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [form, setForm] = useState({
    hypothesis_id: "__none__",
    outcome: "" as "success" | "failure" | "partial" | "",
    description: "",
  });

  useEffect(() => {
    Promise.all([
      apiFetch(`${API}/projects/${id}/anomalies`).then((r) => r.json()),
      apiFetch(`${API}/projects/${id}/hypotheses`).then((r) => r.json()),
    ])
      .then(([aData, hData]) => {
        setAnomalies(aData);
        setHypotheses(hData.filter((h: Hypothesis) => h.status === "accepted"));
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAnalyze = async () => {
    if (!form.description.trim()) return toast.error("Опишіть результат впровадження");
    if (!form.outcome) return toast.error("Оберіть підсумок");

    setAnalyzing(true);
    try {
      const res = await apiFetch(`${API}/projects/${id}/anomalies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hypothesis_id: (form.hypothesis_id && form.hypothesis_id !== "__none__") ? Number(form.hypothesis_id) : undefined,
          outcome: form.outcome,
          description: form.description,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const saved = await res.json();
      setAnomalies((prev) => [saved, ...prev]);
      setExpanded((prev) => new Set([...prev, saved.id]));
      setForm({ hypothesis_id: "__none__", outcome: "", description: "" });
      toast.success("Аналіз аномалії збережено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка аналізу");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (aid: number) => {
    try {
      await apiFetch(`${API}/projects/${id}/anomalies/${aid}`, { method: "DELETE" });
      setAnomalies((prev) => prev.filter((a) => a.id !== aid));
      toast.success("Запис видалено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    }
  };

  const toggleExpand = (aid: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(aid) ? next.delete(aid) : next.add(aid);
      return next;
    });
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">Аналіз аномалій</h2>
        <p className="text-sm text-muted-foreground">
          Записуйте результати впровадження гіпотез. Система аналізує причини успіху або провалу
          і зберігає висновки для наступних гіпотез.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-4 w-4 text-rose-500" />
          <span className="font-semibold text-sm">Новий аналіз</span>
          <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-600 bg-rose-500/5">
            Revenue Intelligence
          </Badge>
        </div>

        <div className="space-y-4">
          {/* Hypothesis select */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Гіпотеза (опціонально)</label>
            <Select value={form.hypothesis_id} onValueChange={(v) => setForm((f) => ({ ...f, hypothesis_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть прийняту гіпотезу..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Без прив'язки до гіпотези</SelectItem>
                {hypotheses.map((h) => (
                  <SelectItem key={h.id} value={String(h.id)}>
                    {h.title.slice(0, 60)}{h.title.length > 60 ? "..." : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Outcome */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Підсумок *</label>
            <div className="grid grid-cols-3 gap-2">
              {(["success", "failure", "partial"] as const).map((o) => {
                const cfg = outcomeConfig[o];
                return (
                  <button
                    key={o}
                    onClick={() => setForm((f) => ({ ...f, outcome: o }))}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all",
                      form.outcome === o
                        ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                        : "border-border hover:bg-secondary/60 text-muted-foreground"
                    )}
                  >
                    <cfg.icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Опис результату *</label>
            <Textarea
              placeholder="Що сталося після впровадження? Які метрики змінились? Що спрацювало або ні?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={analyzing || !form.description.trim() || !form.outcome}
            className="gap-2 w-full sm:w-auto"
          >
            {analyzing ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Аналізую...</>
            ) : (
              <><BarChart3 className="h-4 w-4" />Проаналізувати</>
            )}
          </Button>
        </div>
      </div>

      {/* Results list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-secondary/40 animate-pulse" />)}
        </div>
      ) : anomalies.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Немає записів. Додайте перший аналіз.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {anomalies.map((a) => {
            const cfg = outcomeConfig[a.outcome];
            const isExpanded = expanded.has(a.id);
            return (
              <div key={a.id} className={cn("rounded-xl border bg-card", cfg.border)}>
                <div className="flex items-start gap-3 p-4">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
                    <cfg.icon className={cn("h-4 w-4", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-sm">{a.hypothesis_title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.description}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] shrink-0", cfg.bg, cfg.border, cfg.color)}>
                        {cfg.label}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 pb-3 border-t border-border/50 pt-3">
                  <Button variant="ghost" size="sm" onClick={() => toggleExpand(a.id)}
                    className="h-7 text-xs gap-1 text-muted-foreground">
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {isExpanded ? "Сховати аналіз" : "Показати аналіз"}
                  </Button>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(a.created_at).toLocaleDateString("uk-UA")}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {isExpanded && a.ai_conclusion && (
                  <div className="px-4 pb-4 border-t border-border/30 pt-3">
                    <div className="prose prose-sm max-w-none dark:prose-invert text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{a.ai_conclusion}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AnomalyAnalysis;
