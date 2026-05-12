import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plug, Globe, User, KeyRound, CheckCircle2, Trash2, ExternalLink, BarChart2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/contexts/AuthContext";
import { getWpSettings, saveWpSettings, clearWpSettings, type WpSettings } from "@/lib/wordpress";

// ── WP logo ───────────────────────────────────────────────────────────────────
const WpIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM3.73 12c0-1.25.27-2.43.74-3.5L8.1 19.47A8.28 8.28 0 0 1 3.73 12zm8.27 8.28c-.84 0-1.65-.12-2.42-.34l2.57-7.46 2.63 7.21c.02.04.04.08.06.11a8.3 8.3 0 0 1-2.84.48zm1.17-12.4c.51-.03.97-.08.97-.08.46-.06.4-.72-.06-.69 0 0-1.37.11-2.26.11-.83 0-2.23-.11-2.23-.11-.46-.03-.52.65-.06.68 0 0 .44.05.91.08l1.34 3.68-1.89 5.66-3.14-9.34c.51-.03.97-.08.97-.08.46-.06.4-.72-.06-.69 0 0-1.37.11-2.26.11-.16 0-.34 0-.53-.01A8.28 8.28 0 0 1 12 3.72c2.17 0 4.15.83 5.63 2.19-.04 0-.07-.01-.11-.01-.83 0-1.42.72-1.42 1.5 0 .7.4 1.28.83 1.98.32.56.7 1.28.7 2.32 0 .72-.27 1.56-.63 2.72l-.83 2.76-3.0-8.34zm4.69 11.52-2.59-7.08.05-.14c.53-1.34.71-2.4.71-3.36 0-.35-.02-.67-.07-.97A8.27 8.27 0 0 1 20.27 12a8.27 8.27 0 0 1-3.41 6.94v.46z"/>
  </svg>
);

// ── WordPress settings form ───────────────────────────────────────────────────
const WordPressSettings = ({ onSaved }: { onSaved: () => void }) => {
  const { currentUser } = useAuth();
  const username = currentUser?.username ?? "default";

  const stored = getWpSettings(username);
  const [form, setForm] = useState<WpSettings>(
    stored || { siteUrl: "", username: "", appPassword: "" }
  );
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "ok" | "error">("idle");
  const [testMsg, setTestMsg] = useState("");

  const isConfigured = !!stored;

  const handleSave = () => {
    let url = form.siteUrl.trim();
    const user = form.username.trim();
    const pass = form.appPassword.trim();
    if (!url || !user || !pass) { toast.error("Заповніть усі поля"); return; }
    if (!url.startsWith("http")) url = `https://${url}`;
    url = url.replace(/\/+$/, "");
    saveWpSettings(username, { siteUrl: url, username: user, appPassword: pass });
    setForm({ siteUrl: url, username: user, appPassword: pass });
    setTestStatus("idle");
    toast.success("Налаштування збережено");
    onSaved();
  };

  const handleTest = async () => {
    let url = form.siteUrl.trim();
    const user = form.username.trim();
    const pass = form.appPassword.trim();
    if (!url || !user || !pass) { toast.error("Заповніть усі поля для тесту"); return; }
    if (!url.startsWith("http")) url = `https://${url}`;
    url = url.replace(/\/+$/, "");

    setTesting(true);
    setTestStatus("idle");
    try {
      // Test by publishing a private test post then deleting it
      const res = await apiFetch("/api/wp-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: url, username: user, appPassword: pass,
          title: "[ContentForge] Connection Test",
          content: "Test post — can be deleted.",
          status: "draft",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTestStatus("ok");
      setTestMsg(`З'єднання успішне! Post ID ${data.id} створено як чернетка.`);
      toast.success("WordPress підключено успішно!");
    } catch (e: unknown) {
      setTestStatus("error");
      setTestMsg(e instanceof Error ? e.message : "Помилка підключення");
      toast.error("Помилка підключення до WordPress");
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = () => {
    clearWpSettings(username);
    setForm({ siteUrl: "", username: "", appPassword: "" });
    setTestStatus("idle");
    toast.info("Підключення видалено");
    onSaved();
  };

  return (
    <div className="space-y-5">
      {/* Status banner */}
      {isConfigured && (
        <div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              Підключено до {stored.siteUrl.replace(/^https?:\/\//, "")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`${stored.siteUrl}/wp-admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 underline underline-offset-2"
            >
              <ExternalLink className="h-3 w-3" />WP Admin
            </a>
            <Button variant="ghost" size="sm" onClick={handleDisconnect} className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1">
              <Trash2 className="h-3.5 w-3.5" />Відключити
            </Button>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <p className="font-medium">Як отримати Application Password:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-xs opacity-90">
            <li>Зайдіть в WordPress Admin → Профіль (Users → Your Profile)</li>
            <li>Прокрутіть до розділу <strong>Application Passwords</strong></li>
            <li>Введіть назву (наприклад: ContentForge) і натисніть <strong>Add New</strong></li>
            <li>Скопіюйте пароль — він більше не відобразиться</li>
          </ol>
        </div>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" />URL сайту
            </Label>
            <Input
              placeholder="https://mysite.com"
              value={form.siteUrl}
              onChange={(e) => setForm((f) => ({ ...f, siteUrl: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-2">
                <User className="h-3.5 w-3.5" />Ім'я користувача WordPress
              </Label>
              <Input
                placeholder="admin"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5" />Application Password
              </Label>
              <Input
                type="password"
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                value={form.appPassword}
                onChange={(e) => setForm((f) => ({ ...f, appPassword: e.target.value }))}
                className="font-mono"
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        {testStatus !== "idle" && (
          <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
            testStatus === "ok"
              ? "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400"
              : "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400"
          }`}>
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{testMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} className="bg-[#21759b] hover:bg-[#1a5c7a] text-white border-0 gap-2">
            <WpIcon className="h-4 w-4" />
            {isConfigured ? "Оновити налаштування" : "Зберегти і підключити"}
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
            {testing ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /></> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {testing ? "Тестую..." : "Перевірити з'єднання"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── GSC logo ──────────────────────────────────────────────────────────────────
const GscIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4285F4" />
    <path d="M12 7v10M7 12h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="12" r="3" fill="white" />
  </svg>
);

// ── Google Search Console integration ─────────────────────────────────────────
const GscSettings = ({ onChanged }: { onChanged: () => void }) => {
  const [status, setStatus] = useState<{ connected: boolean; site_url: string | null } | null>(null);
  const [sites, setSites] = useState<{ siteUrl: string; permissionLevel: string }[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [loadingSites, setLoadingSites] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [manualSiteUrl, setManualSiteUrl] = useState("");
  const [addingSite, setAddingSite] = useState(false);

  const loadStatus = async () => {
    try {
      const res = await apiFetch("/api/gsc/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.site_url) setSelectedSite(data.site_url);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await apiFetch("/api/gsc/auth-url");
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error("Помилка при підключенні");
      setConnecting(false);
    }
  };

  const handleLoadSites = async () => {
    setLoadingSites(true);
    try {
      const res = await apiFetch("/api/gsc/sites");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка завантаження сайтів");
      const list = Array.isArray(data) ? data : (data.sites || data.siteEntry || []);
      if (list.length === 0) {
        toast.warning("Сайтів у Google Search Console не знайдено. Переконайтесь, що сайт додано в GSC і верифіковано під цим Google акаунтом.");
      } else {
        setSites(list);
        toast.success(`Знайдено ${list.length} ${list.length === 1 ? "сайт" : "сайтів"}`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Не вдалося завантажити сайти");
    } finally {
      setLoadingSites(false);
    }
  };

  const handleSaveSite = async () => {
    if (!selectedSite) return toast.error("Оберіть сайт");
    setSaving(true);
    try {
      const res = await apiFetch("/api/gsc/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_url: selectedSite }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await loadStatus();
      toast.success("Сайт збережено");
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSite = async () => {
    const url = manualSiteUrl.trim();
    if (!url) return;
    setAddingSite(true);
    try {
      const res = await apiFetch("/api/gsc/add-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_url: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка додавання сайту");
      await loadStatus();
      setManualSiteUrl("");
      toast.success("Сайт додано! Верифікуйте його в GSC якщо ще не зробили.");
      await handleLoadSites();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    } finally {
      setAddingSite(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await apiFetch("/api/gsc/disconnect", { method: "DELETE" });
      setStatus({ connected: false, site_url: null });
      setSites([]);
      setSelectedSite("");
      toast.info("GSC відключено");
      onChanged();
    } catch {
      toast.error("Помилка відключення");
    }
  };

  if (!status) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Завантаження...</div>;
  }

  return (
    <div className="space-y-5">
      {status.connected ? (
        <>
          <div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {status.site_url ? `Підключено: ${status.site_url}` : "Підключено (сайт не обраний)"}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDisconnect} className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1">
              <Trash2 className="h-3.5 w-3.5" />Відключити
            </Button>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Оберіть сайт для відображення аналітики:</p>
            <div className="flex gap-3">
              {sites.length === 0 ? (
                <div className="w-full space-y-4">
                  {/* Add site manually */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Додати сайт вручну
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://yoursite.com"
                        value={manualSiteUrl}
                        onChange={(e) => setManualSiteUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddSite()}
                        className="text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={addingSite || !manualSiteUrl.trim()}
                        onClick={handleAddSite}
                        className="shrink-0"
                      >
                        {addingSite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Додати"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Введіть точний URL як він зареєстрований в GSC (з https://)
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">або</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* Load from GSC */}
                  <Button onClick={handleLoadSites} disabled={loadingSites} variant="outline" className="w-full gap-2">
                    {loadingSites ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Завантаження...</> : <><BarChart2 className="h-3.5 w-3.5" />Завантажити сайти з GSC</>}
                  </Button>

                  {/* Instructions */}
                  <div className="rounded-lg border border-dashed p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Як додати сайт в Google Search Console:</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Зайдіть на <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-primary underline">search.google.com/search-console</a></li>
                      <li>Натисніть "Додати ресурс" → оберіть "URL-префікс"</li>
                      <li>Введіть URL і верифікуйте через HTML-тег або DNS</li>
                      <li>Після верифікації поверніться сюди і натисніть "Завантажити сайти з GSC"</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <>
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Оберіть сайт..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleSaveSite} disabled={saving || !selectedSite} className="gap-2">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Зберегти
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
            <p className="font-medium mb-1">Що дає підключення GSC:</p>
            <ul className="list-disc list-inside text-xs space-y-0.5 opacity-90">
              <li>Кліки, покази, CTR та позиція для кожної публікації</li>
              <li>Аналітика прямо на картках у «Мій контент»</li>
              <li>Дані за останні 30 днів</li>
            </ul>
          </div>
          <Button onClick={handleConnect} disabled={connecting} className="gap-2 bg-[#4285F4] hover:bg-[#3367D6] text-white border-0">
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <GscIcon className="h-4 w-4" />}
            {connecting ? "Перенаправлення..." : "Підключити Google Search Console"}
          </Button>
        </div>
      )}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const IntegrationsPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const gscStatus = searchParams.get("gsc");
    if (gscStatus === "connected") {
      toast.success("Google Search Console підключено!");
      setSearchParams({}, { replace: true });
      setRefreshKey((k) => k + 1);
    } else if (gscStatus === "error") {
      toast.error("Помилка підключення GSC. Спробуйте ще раз.");
      setSearchParams({}, { replace: true });
    }
  }, []);

  return (
    <AppLayout title="Інтеграції" icon={Plug}>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold">Інтеграції</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Підключіть ContentForge до зовнішніх платформ для автопублікації контенту.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WpIcon className="h-5 w-5 text-[#21759b]" />
              WordPress
            </CardTitle>
            <CardDescription>
              Публікуйте згенеровані статті прямо у WordPress через REST API та Application Passwords.
              Чернетки або відразу публікація — на ваш вибір.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WordPressSettings key={refreshKey} onSaved={() => setRefreshKey((k) => k + 1)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GscIcon className="h-5 w-5" />
              Google Search Console
            </CardTitle>
            <CardDescription>
              Підключіть GSC щоб бачити кліки, покази, CTR та позицію для кожної публікації прямо в «Мій контент».
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GscSettings key={refreshKey} onChanged={() => setRefreshKey((k) => k + 1)} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default IntegrationsPage;
