import { apiFetch } from "@/contexts/AuthContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  FolderOpen, Plus, ChevronLeft, LogOut, FileText,
  Lightbulb, BarChart3, CalendarDays, Users2, ArrowRight,
  BookOpen, Trash2, History,
} from "lucide-react";
import { toast } from "sonner";

const API = "/api";

interface Project {
  id: number;
  name: string;
  description: string;
  niche: string;
  created_at: string;
  hypothesis_count: number;
  accepted_count: number;
  plan_count: number;
  report_count: number;
  has_kb: number;
}

async function apiGet(path: string) {
  const res = await apiFetch(`${API}${path}`);
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

async function apiPost(path: string, body: object) {
  const res = await apiFetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

async function apiDelete(path: string) {
  const res = await apiFetch(`${API}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", niche: "" });

  // Load on mount
  useState(() => {
    apiGet("/projects")
      .then(setProjects)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  });

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error("Введіть назву проєкту");
    setCreating(true);
    try {
      const project = await apiPost("/projects", form);
      setProjects((prev) => [project, ...prev]);
      setShowCreate(false);
      setForm({ name: "", description: "", niche: "" });
      toast.success("Проєкт створено");
      navigate(`/projects/${project.id}/kb`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Видалити проєкт «${name}»? Всі дані буде видалено.`)) return;
    try {
      await apiDelete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Проєкт видалено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container flex items-center justify-between py-3 max-w-5xl">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground gap-1 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">Dashboard</span>
            </Button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <FolderOpen className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Проєкти</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 hover:opacity-80">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-hero-gradient">
                <FileText className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold hidden sm:block">ContentForge</span>
            </button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/history")}
              className="h-8 text-muted-foreground hover:text-foreground text-xs gap-1 px-2">
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Історія</span>
            </Button>
            <Button variant="ghost" size="icon"
              onClick={() => { logout(); navigate("/login"); }}
              className="h-8 w-8 text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-10 max-w-5xl">
        {/* Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Мої проєкти</h1>
            <p className="text-muted-foreground text-sm">
              Маркетингові гіпотези, контент-плани та аналіз конкурентів
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Новий проєкт
          </Button>
        </div>

        {/* Features strip */}
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: BookOpen, label: "База знань", color: "text-blue-500", bg: "bg-blue-500/10" },
            { icon: Lightbulb, label: "Гіпотези", color: "text-amber-500", bg: "bg-amber-500/10" },
            { icon: BarChart3, label: "Аномалії", color: "text-rose-500", bg: "bg-rose-500/10" },
            { icon: CalendarDays, label: "Контент-план", color: "text-emerald-500", bg: "bg-emerald-500/10" },
          ].map(({ icon: Icon, label, color, bg }) => (
            <div key={label} className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
              </div>
              <span className="text-xs font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Projects list */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            Завантаження...
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <FolderOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Немає проєктів</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              Створіть перший проєкт, заповніть базу знань — і система почне генерувати маркетингові гіпотези
            </p>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Створити проєкт
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => navigate(`/projects/${project.id}/kb`)}
                onDelete={() => handleDelete(project.id, project.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Новий проєкт
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Назва *</label>
              <Input
                placeholder="Наприклад: Інтернет-магазин кави"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ніша / ринок</label>
              <Input
                placeholder="Наприклад: E-commerce, B2B SaaS, Послуги..."
                value={form.niche}
                onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Короткий опис</label>
              <Textarea
                placeholder="Що це за проєкт? Яка основна мета?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Скасувати</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Створення..." : "Створити проєкт"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Project Card ──────────────────────────────────────────────────────────────

const ProjectCard = ({
  project,
  onOpen,
  onDelete,
}: {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
}) => {
  const stats = [
    { icon: Lightbulb, label: "Гіпотез", value: project.hypothesis_count, color: "text-amber-500" },
    { icon: CalendarDays, label: "Планів", value: project.plan_count, color: "text-emerald-500" },
    { icon: Users2, label: "Звітів", value: project.report_count, color: "text-violet-500" },
  ];

  return (
    <div className="group rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight">{project.name}</h3>
            {project.niche && (
              <span className="text-xs text-muted-foreground">{project.niche}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {project.has_kb ? (
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
              KB ✓
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-600 bg-orange-500/5">
              KB немає
            </Badge>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="flex items-center gap-3 mb-4">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-1 text-xs text-muted-foreground">
            <Icon className={`h-3 w-3 ${color}`} />
            <span>{value} {label}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onOpen}
          className="flex-1 gap-1 h-8 text-xs"
        >
          Відкрити <ArrowRight className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default ProjectsPage;
