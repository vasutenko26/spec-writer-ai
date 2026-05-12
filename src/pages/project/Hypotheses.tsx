import { apiFetch } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Lightbulb, Sparkles, CheckCircle2, XCircle, Clock,
  Trash2, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Project } from "../ProjectWorkspace";

const API = "/api";

interface Hypothesis {
  id: number;
  title: string;
  description: string;
  status: "pending" | "accepted" | "rejected";
  rejection_reason?: string;
  implementation_result?: string;
  created_at: string;
}

const statusConfig = {
  pending: { label: "Нова", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: Clock },
  accepted: { label: "Прийнята", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: CheckCircle2 },
  rejected: { label: "Відхилена", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30", icon: XCircle },
};

const Hypotheses = () => {
  const { id } = useParams<{ id: string }>();
  const { project } = useOutletContext<{ project: Project | null }>();
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [focus, setFocus] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [rejectDialog, setRejectDialog] = useState<{ id: number; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    loadHypotheses();
  }, [id]);

  const loadHypotheses = async () => {
    try {
      const data = await apiFetch(`${API}/projects/${id}/hypotheses`).then((r) => r.json());
      setHypotheses(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!project?.has_kb) {
      toast.error("Спочатку заповніть Базу знань");
      return;
    }
    setGenerating(true);
    try {
      const res = await apiFetch(`${API}/projects/${id}/hypotheses/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { saved } = await res.json();
      toast.success(`Згенеровано ${saved.length} гіпотез`);
      loadHypotheses();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка генерації");
    } finally {
      setGenerating(false);
    }
  };

  const handleAccept = async (hid: number) => {
    try {
      const res = await apiFetch(`${API}/projects/${id}/hypotheses/${hid}/accept`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      setHypotheses((prev) => prev.map((h) => h.id === hid ? { ...h, status: "accepted" } : h));
      toast.success("Гіпотезу прийнято до тестування");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    }
  };

  const handleReject = async () => {
    if (!rejectDialog || !rejectReason.trim()) return;
    setRejecting(true);
    try {
      const res = await apiFetch(`${API}/projects/${id}/hypotheses/${rejectDialog.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setHypotheses((prev) =>
        prev.map((h) => h.id === rejectDialog.id
          ? { ...h, status: "rejected", rejection_reason: rejectReason }
          : h
        )
      );
      setRejectDialog(null);
      setRejectReason("");
      toast.success("Гіпотезу відхилено. Причину збережено.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    } finally {
      setRejecting(false);
    }
  };

  const handleDelete = async (hid: number) => {
    try {
      await apiFetch(`${API}/projects/${id}/hypotheses/${hid}`, { method: "DELETE" });
      setHypotheses((prev) => prev.filter((h) => h.id !== hid));
      toast.success("Видалено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    }
  };

  const toggleExpand = (hid: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(hid) ? next.delete(hid) : next.add(hid);
      return next;
    });
  };

  const pending = hypotheses.filter((h) => h.status === "pending");
  const accepted = hypotheses.filter((h) => h.status === "accepted");
  const rejected = hypotheses.filter((h) => h.status === "rejected");

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">Маркетингові гіпотези</h2>
        <p className="text-sm text-muted-foreground">
          Генерація ідей на основі бази знань, історії експериментів і фреймворку Growth Engine
        </p>
      </div>

      {/* Generator */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="font-semibold text-sm">Генерація гіпотез</span>
          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 bg-amber-500/5">
            Growth Engine
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Система проаналізує базу знань і історію експериментів — і запропонує 4 конкретні гіпотези з ICE-оцінкою.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Фокус: утримання, конверсія, залучення... (опціонально)"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="gap-2 shrink-0"
          >
            {generating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? "Генерація..." : "Згенерувати"}
          </Button>
        </div>
        {!project?.has_kb && (
          <p className="text-xs text-orange-500 mt-2">
            ⚠ Заповніть Базу знань для точніших гіпотез
          </p>
        )}
      </div>

      {/* Stats */}
      {hypotheses.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Нових", value: pending.length, color: "text-amber-500", bg: "bg-amber-500/10" },
            { label: "Прийнято", value: accepted.length, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Відхилено", value: rejected.length, color: "text-rose-500", bg: "bg-rose-500/10" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={cn("rounded-xl border border-border p-3 text-center", bg.replace("/10", "/5"))}>
              <div className={cn("text-2xl font-bold", color)}>{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Hypotheses list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary/40 animate-pulse" />
          ))}
        </div>
      ) : hypotheses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Натисніть «Згенерувати» для отримання перших гіпотез</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hypotheses.map((h) => {
            const cfg = statusConfig[h.status];
            const isExpanded = expanded.has(h.id);
            return (
              <div
                key={h.id}
                className={cn(
                  "rounded-xl border bg-card transition-all",
                  cfg.border,
                  h.status === "accepted" && "bg-emerald-500/5",
                  h.status === "rejected" && "bg-rose-500/5 opacity-70",
                )}
              >
                {/* Card header */}
                <div className="flex items-start gap-3 p-4">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5", cfg.bg)}>
                    <cfg.icon className={cn("h-4 w-4", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm leading-snug">{h.title}</h4>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] shrink-0", cfg.bg, cfg.border, cfg.color)}
                      >
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(h.created_at).toLocaleDateString("uk-UA")}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 px-4 pb-3 border-t border-border/50 pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(h.id)}
                    className="h-7 text-xs gap-1 text-muted-foreground"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {isExpanded ? "Сховати" : "Деталі"}
                  </Button>
                  {h.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(h.id)}
                        className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Прийняти
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRejectDialog({ id: h.id, title: h.title })}
                        className="h-7 text-xs gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                      >
                        <XCircle className="h-3 w-3" />
                        Відхилити
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(h.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive ml-auto"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Expanded content */}
                {isExpanded && h.description && (
                  <div className="px-4 pb-4 border-t border-border/30 pt-3">
                    <div className="prose prose-sm max-w-none dark:prose-invert text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {h.description}
                      </ReactMarkdown>
                    </div>
                    {h.rejection_reason && (
                      <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3">
                        <p className="text-xs font-medium text-rose-600 mb-1">Причина відхилення:</p>
                        <p className="text-xs text-muted-foreground">{h.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => { setRejectDialog(null); setRejectReason(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <XCircle className="h-4 w-4" />
              Відхилити гіпотезу
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">
              Гіпотеза: <span className="font-medium text-foreground">«{rejectDialog?.title}»</span>
            </p>
            <label className="text-sm font-medium mb-1.5 block">
              Причина відхилення *
            </label>
            <Textarea
              placeholder="Чому відхиляєте? Це допоможе уникнути схожих ідей у майбутньому..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectReason(""); }}>
              Скасувати
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejecting}
              variant="destructive"
              className="gap-2"
            >
              {rejecting ? "Збереження..." : "Відхилити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Hypotheses;
