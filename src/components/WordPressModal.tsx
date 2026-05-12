import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, CheckCircle2, AlertCircle, ExternalLink,
  Globe, KeyRound, User, Settings, Trash2, Send,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getWpSettings, saveWpSettings, clearWpSettings,
  publishToWordPress, extractH1,
  type WpSettings,
} from "@/lib/wordpress";

// ── WP logo icon (simple SVG inline) ─────────────────────────────────────────
const WpIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM3.73 12c0-1.25.27-2.43.74-3.5L8.1 19.47A8.28 8.28 0 0 1 3.73 12zm8.27 8.28c-.84 0-1.65-.12-2.42-.34l2.57-7.46 2.63 7.21c.02.04.04.08.06.11a8.3 8.3 0 0 1-2.84.48zm1.17-12.4c.51-.03.97-.08.97-.08.46-.06.4-.72-.06-.69 0 0-1.37.11-2.26.11-.83 0-2.23-.11-2.23-.11-.46-.03-.52.65-.06.68 0 0 .44.05.91.08l1.34 3.68-1.89 5.66-3.14-9.34c.51-.03.97-.08.97-.08.46-.06.4-.72-.06-.69 0 0-1.37.11-2.26.11-.16 0-.34 0-.53-.01A8.28 8.28 0 0 1 12 3.72c2.17 0 4.15.83 5.63 2.19-.04 0-.07-.01-.11-.01-.83 0-1.42.72-1.42 1.5 0 .7.4 1.28.83 1.98.32.56.7 1.28.7 2.32 0 .72-.27 1.56-.63 2.72l-.83 2.76-3.0-8.34zm4.69 11.52-2.59-7.08.05-.14c.53-1.34.71-2.4.71-3.36 0-.35-.02-.67-.07-.97A8.27 8.27 0 0 1 20.27 12a8.27 8.27 0 0 1-3.41 6.94v.46z"/>
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  content: string; // Markdown content
}

type ModalMode = "configure" | "publish" | "success";

// ── Component ─────────────────────────────────────────────────────────────────

const WordPressModal = ({ open, onClose, content }: Props) => {
  const { currentUser } = useAuth();
  const username = currentUser?.username ?? "default";

  // Settings form
  const [settings, setSettings] = useState<WpSettings>({ siteUrl: "", username: "", appPassword: "" });
  const [savingSettings, setSavingSettings] = useState(false);

  // Publish form
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"draft" | "publish">("draft");
  const [publishing, setPublishing] = useState(false);

  // State machine
  const [mode, setMode] = useState<ModalMode>("configure");
  const [publishResult, setPublishResult] = useState<{ id: number; link: string } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Load settings on open
  useEffect(() => {
    if (!open) return;
    const stored = getWpSettings(username);
    if (stored) {
      setSettings(stored);
      setMode("publish");
    } else {
      setSettings({ siteUrl: "", username: "", appPassword: "" });
      setMode("configure");
    }
    // Auto-extract title from H1
    const h1 = extractH1(content);
    setTitle(h1);
    setPublishResult(null);
    setPublishError(null);
    setPublishing(false);
  }, [open, username, content]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSaveSettings = () => {
    const url = settings.siteUrl.trim();
    const user = settings.username.trim();
    const pass = settings.appPassword.trim();
    if (!url || !user || !pass) {
      toast.error("Заповніть усі поля підключення");
      return;
    }
    // Normalise URL
    let normUrl = url;
    if (!normUrl.startsWith("http")) normUrl = `https://${normUrl}`;
    normUrl = normUrl.replace(/\/+$/, "");

    setSavingSettings(true);
    const s: WpSettings = { siteUrl: normUrl, username: user, appPassword: pass };
    saveWpSettings(username, s);
    setSettings(s);
    setSavingSettings(false);
    setMode("publish");
    toast.success("Налаштування WordPress збережено");
  };

  const handlePublish = async () => {
    if (!title.trim()) { toast.error("Введіть заголовок статті"); return; }
    const stored = getWpSettings(username);
    if (!stored) { setMode("configure"); return; }

    setPublishing(true);
    setPublishError(null);

    try {
      const result = await publishToWordPress(stored, title, content, status);
      setPublishResult(result);
      setMode("success");
      toast.success(status === "publish" ? "Статтю опубліковано!" : "Чернетку збережено в WordPress!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Невідома помилка";
      setPublishError(msg);
    } finally {
      setPublishing(false);
    }
  };

  const handleDisconnect = () => {
    clearWpSettings(username);
    setSettings({ siteUrl: "", username: "", appPassword: "" });
    setMode("configure");
    toast.info("Підключення до WordPress видалено");
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const storedSettings = getWpSettings(username);
  const siteDomain = storedSettings
    ? storedSettings.siteUrl.replace(/^https?:\/\//, "").replace(/\/.*/, "")
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WpIcon className="h-5 w-5 text-[#21759b]" />
            {mode === "configure" ? "Підключення до WordPress"
              : mode === "success" ? "Опубліковано!"
              : "Публікація в WordPress"}
          </DialogTitle>
          {mode === "configure" && (
            <DialogDescription>
              Вкажіть дані для підключення через WordPress REST API та Application Passwords.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* ── Configure mode ──────────────────────────────────────────────── */}
        {mode === "configure" && (
          <div className="space-y-4 pt-1">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              Створіть Application Password в WordPress: <strong>Профіль → Application Passwords → Add New</strong>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />URL сайту
                </Label>
                <Input
                  placeholder="https://mysite.com"
                  value={settings.siteUrl}
                  onChange={(e) => setSettings((s) => ({ ...s, siteUrl: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />Ім'я користувача
                </Label>
                <Input
                  placeholder="admin"
                  value={settings.username}
                  onChange={(e) => setSettings((s) => ({ ...s, username: e.target.value }))}
                  className="h-8 text-sm"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />Application Password
                </Label>
                <Input
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  value={settings.appPassword}
                  onChange={(e) => setSettings((s) => ({ ...s, appPassword: e.target.value }))}
                  className="h-8 text-sm font-mono"
                  autoComplete="new-password"
                />
                <p className="text-[11px] text-muted-foreground">
                  Пробіли в паролі — це нормально, скопіюйте як є
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSaveSettings} disabled={savingSettings} className="flex-1 bg-[#21759b] hover:bg-[#1a5c7a] text-white border-0">
                <WpIcon className="h-4 w-4 mr-2" />
                Зберегти і підключити
              </Button>
              <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
                Скасувати
              </Button>
            </div>
          </div>
        )}

        {/* ── Publish mode ────────────────────────────────────────────────── */}
        {mode === "publish" && (
          <div className="space-y-4 pt-1">
            {/* Connected site */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <WpIcon className="h-4 w-4 text-[#21759b]" />
                <span className="text-sm font-medium">{siteDomain}</span>
                <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-600 bg-green-500/5">
                  Підключено
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMode("configure")}
                  title="Змінити налаштування"
                  className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleDisconnect}
                  title="Відключити"
                  className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs">Заголовок статті</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Введіть заголовок..."
                className="h-8 text-sm"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs">Статус публікації</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "publish")}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                      Чернетка (рекомендовано)
                    </span>
                  </SelectItem>
                  <SelectItem value="publish">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                      Опублікувати одразу
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Error */}
            {publishError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{publishError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handlePublish}
                disabled={publishing || !title.trim()}
                className="flex-1 bg-[#21759b] hover:bg-[#1a5c7a] text-white border-0"
              >
                {publishing
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Відправляю...</>
                  : <><Send className="h-4 w-4 mr-2" />Відправити на сайт</>}
              </Button>
              <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
                Скасувати
              </Button>
            </div>
          </div>
        )}

        {/* ── Success mode ─────────────────────────────────────────────────── */}
        {mode === "success" && publishResult && (
          <div className="space-y-4 pt-1">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">
                  {status === "publish" ? "Статтю опубліковано!" : "Чернетку збережено!"}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Post ID: <span className="font-mono">{publishResult.id}</span> · {siteDomain}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                asChild
                className="w-full bg-[#21759b] hover:bg-[#1a5c7a] text-white border-0"
              >
                <a href={publishResult.link} target="_blank" rel="noopener noreferrer" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Переглянути на сайті
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={() => { setMode("publish"); setPublishResult(null); setPublishError(null); }}
                className="w-full"
              >
                Опублікувати ще раз
              </Button>
              <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
                Закрити
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WordPressModal;
