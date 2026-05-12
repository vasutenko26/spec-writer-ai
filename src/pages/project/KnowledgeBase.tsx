import { apiFetch } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Project } from "../ProjectWorkspace";

const API = "/api";

interface KB {
  id?: number;
  project_id?: number;
  product?: string;
  target_audience?: string;
  usp?: string;
  pain_points?: string;
  competitors?: string;
  market?: string;
  business_goals?: string;
  extra_context?: string;
  updated_at?: string;
}

const fields: { key: keyof KB; label: string; hint: string; multiline?: boolean }[] = [
  {
    key: "product",
    label: "Продукт / послуга",
    hint: "Що саме ви продаєте? Коротко опишіть цінність.",
    multiline: true,
  },
  {
    key: "target_audience",
    label: "Цільова аудиторія",
    hint: "Хто ваш покупець? Вік, посада, болі, звички.",
    multiline: true,
  },
  {
    key: "usp",
    label: "УТП (унікальна торгова пропозиція)",
    hint: "Чому обирають вас, а не конкурентів?",
    multiline: true,
  },
  {
    key: "pain_points",
    label: "Болі аудиторії",
    hint: "Які проблеми вирішує ваш продукт? Перелічіть 3–5 головних болів.",
    multiline: true,
  },
  {
    key: "competitors",
    label: "Конкуренти",
    hint: "Назвіть 3–5 основних конкурентів та їхні ключові відмінності.",
    multiline: false,
  },
  {
    key: "market",
    label: "Ринок / регіон",
    hint: "Де працюєте? Україна, Європа, США? Онлайн/офлайн?",
    multiline: false,
  },
  {
    key: "business_goals",
    label: "Цілі бізнесу",
    hint: "Чого хочете досягти за 3–6 місяців? Зростання виручки, впізнаваність, ліди...",
    multiline: true,
  },
  {
    key: "extra_context",
    label: "Додатковий контекст",
    hint: "Сезонність, обмеження, важливі факти, які варто враховувати.",
    multiline: true,
  },
];

const KnowledgeBase = () => {
  const { id } = useParams<{ id: string }>();
  const { project, setProject } = useOutletContext<{ project: Project | null; setProject: (p: Project) => void }>();
  const [kb, setKb] = useState<KB>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch(`${API}/projects/${id}/kb`)
      .then((r) => r.json())
      .then((data) => { setKb(data || {}); setLoaded(true); })
      .catch((e) => toast.error(e.message));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/projects/${id}/kb`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kb),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const saved = await res.json();
      setKb(saved);
      // refresh project stats
      const proj = await apiFetch(`${API}/projects/${id}`).then((r) => r.json());
      setProject(proj);
      toast.success("Базу знань збережено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  const filledCount = fields.filter((f) => kb[f.key]?.trim()).length;
  const totalCount = fields.length;
  const isComplete = filledCount === totalCount;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold mb-1">База знань</h2>
          <p className="text-sm text-muted-foreground">
            Чим точніше заповните — тим кращі гіпотези та контент.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {isComplete ? (
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/5 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Заповнено
            </Badge>
          ) : (
            <Badge variant="outline" className="border-orange-500/40 text-orange-600 bg-orange-500/5 gap-1">
              <AlertCircle className="h-3 w-3" />
              {filledCount}/{totalCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(filledCount / totalCount) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Заповнено {filledCount} з {totalCount} полів
        </p>
      </div>

      {/* Form */}
      {loaded && (
        <div className="space-y-5">
          {fields.map(({ key, label, hint, multiline }) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-sm font-medium">{label}</label>
                {kb[key]?.trim() && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
              </div>
              <p className="text-xs text-muted-foreground mb-2">{hint}</p>
              {multiline ? (
                <Textarea
                  value={kb[key] || ""}
                  onChange={(e) => setKb((prev) => ({ ...prev, [key]: e.target.value }))}
                  rows={3}
                  className="resize-none"
                  placeholder={hint}
                />
              ) : (
                <Input
                  value={kb[key] || ""}
                  onChange={(e) => setKb((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={hint}
                />
              )}
            </div>
          ))}

          {kb.updated_at && (
            <p className="text-xs text-muted-foreground">
              Останнє оновлення: {new Date(kb.updated_at).toLocaleString("uk-UA")}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Збереження..." : "Зберегти базу знань"}
            </Button>
            {!project?.has_kb && (
              <p className="text-xs text-muted-foreground">
                Після збереження можна переходити до гіпотез
              </p>
            )}
          </div>
        </div>
      )}

      {!loaded && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-secondary/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Tip */}
      <div className="mt-8 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-600 mb-1">Порада</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              База знань використовується як контекст при генерації гіпотез, контент-планів та аналізу конкурентів.
              Чим конкретніший опис — тим точніші рекомендації. Не використовуйте загальні фрази.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
