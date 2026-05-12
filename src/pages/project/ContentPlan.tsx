import { apiFetch } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CalendarDays, Sparkles, Loader2, Trash2, ChevronDown, ChevronUp, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Project } from "../ProjectWorkspace";

const API = "/api";

interface ContentPlan {
  id: number;
  title: string;
  period: string;
  raw_text: string;
  created_at: string;
}

const periods = ["7 днів", "14 днів", "30 днів", "60 днів", "90 днів"];

const ContentPlan = () => {
  const { id } = useParams<{ id: string }>();
  const { project } = useOutletContext<{ project: Project | null }>();
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [form, setForm] = useState({
    period: "30 днів",
    platforms: "",
    goals: "",
  });

  useEffect(() => {
    apiFetch(`${API}/projects/${id}/content-plan`)
      .then((r) => r.json())
      .then(setPlans)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleGenerate = async () => {
    if (!project?.has_kb) {
      toast.error("Спочатку заповніть Базу знань");
      return;
    }
    setGenerating(true);
    try {
      const res = await apiFetch(`${API}/projects/${id}/content-plan/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const plan = await res.json();
      setPlans((prev) => [plan, ...prev]);
      setExpanded(plan.id);
      toast.success("Контент-план створено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка генерації");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (pid: number) => {
    try {
      await apiFetch(`${API}/projects/${id}/content-plan/${pid}`, { method: "DELETE" });
      setPlans((prev) => prev.filter((p) => p.id !== pid));
      if (expanded === pid) setExpanded(null);
      toast.success("Видалено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    }
  };

  const handleDownload = (plan: ContentPlan) => {
    const blob = new Blob([plan.raw_text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-plan-${plan.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">Контент-план</h2>
        <p className="text-sm text-muted-foreground">
          Детальний план публікацій за методологією Content-Eval з оцінкою вірусності
        </p>
      </div>

      {/* Generator */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          <span className="font-semibold text-sm">Генерація плану</span>
          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
            Content-Eval
          </Badge>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Період</label>
            <Select value={form.period} onValueChange={(v) => setForm((f) => ({ ...f, period: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Платформи</label>
            <Input
              placeholder="Instagram, Telegram, Blog..."
              value={form.platforms}
              onChange={(e) => setForm((f) => ({ ...f, platforms: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Цілі кампанії</label>
            <Input
              placeholder="Ліди, трафік, впізнаваність..."
              value={form.goals}
              onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))}
            />
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={generating} className="gap-2">
          {generating ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Генерація (~60 сек)...</>
          ) : (
            <><Sparkles className="h-4 w-4" />Створити контент-план</>
          )}
        </Button>

        {generating && (
          <p className="text-xs text-muted-foreground mt-2">
            Аналізується база знань, історія гіпотез, формується 20+ ідей з оцінкою...
          </p>
        )}
      </div>

      {/* Plans list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-secondary/40 animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Немає контент-планів. Створіть перший.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <CalendarDays className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{plan.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {new Date(plan.created_at).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => handleDownload(plan)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Завантажити Markdown"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}
                    className="h-8 text-xs gap-1 text-muted-foreground"
                  >
                    {expanded === plan.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {expanded === plan.id ? "Сховати" : "Показати"}
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => handleDelete(plan.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {expanded === plan.id && (
                <div className="border-t border-border px-6 py-5">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan.raw_text}</ReactMarkdown>
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

export default ContentPlan;
