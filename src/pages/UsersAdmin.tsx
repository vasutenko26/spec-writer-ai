import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiFetch, ALL_TOOL_IDS, ToolId } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, Plus, Pencil, Trash2, Check, X,
  ShieldCheck, User as UserIcon, Lock, ShieldOff, QrCode,
} from "lucide-react";
import { toast } from "sonner";

interface UserRecord {
  id: number;
  username: string;
  role: "admin" | "user";
  permissions: ToolId[];
  priority: number;
  totp_enabled: boolean;
}

interface TotpSetup {
  userId: number;
  username: string;
  qrDataUrl: string;
  secret: string;
}

const TOOL_NAMES: Record<ToolId, string> = {
  serp: "Аналіз видачі",
  brief: "Генерація ТЗ",
  content: "Генерація контенту",
  seo: "SEO-перевірка",
  lsi: "LSI / TF-IDF",
  pagespeed: "Технічний аудит",
  cluster: "Кластеризатор",
  linking: "Перелінковка",
  campaign: "SEO-кампанія",
};

const UsersAdmin = () => {
  const navigate = useNavigate();
  const { isAdmin, currentUser } = useAuth();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "user">("user");
  const [formPermissions, setFormPermissions] = useState<ToolId[]>([...ALL_TOOL_IDS]);
  const [formPriority, setFormPriority] = useState(5);

  const [totpSetup, setTotpSetup] = useState<TotpSetup | null>(null);
  const [totpLoading, setTotpLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) { navigate("/dashboard"); return; }
    apiFetch("/api/auth/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => toast.error("Не вдалося завантажити список користувачів"))
      .finally(() => setLoading(false));
  }, [isAdmin, navigate]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormUsername("");
    setFormPassword("");
    setFormRole("user");
    setFormPermissions([...ALL_TOOL_IDS]);
    setFormPriority(5);
  };

  const handleStartCreate = () => { resetForm(); setShowForm(true); };

  const handleStartEdit = (user: UserRecord) => {
    setEditingId(user.id);
    setFormUsername(user.username);
    setFormPassword("");
    setFormRole(user.role);
    setFormPermissions(user.permissions ?? [...ALL_TOOL_IDS]);
    setFormPriority(user.priority ?? 5);
    setShowForm(true);
  };

  const togglePermission = (tool: ToolId) => {
    setFormPermissions((prev) => prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]);
  };

  const handleSave = async () => {
    const trimmedUsername = formUsername.trim();
    if (!trimmedUsername) { toast.error("Введіть логін користувача"); return; }
    if (!editingId && !formPassword.trim()) { toast.error("Введіть пароль"); return; }
    if (formPriority < 1 || formPriority > 10) { toast.error("Пріоритет: від 1 до 10"); return; }

    const effectivePermissions = formRole === "admin" ? [...ALL_TOOL_IDS] : formPermissions;
    const body: Record<string, unknown> = { role: formRole, permissions: effectivePermissions, priority: formPriority };
    if (formPassword.trim()) body.password = formPassword.trim();

    try {
      if (editingId) {
        const res = await apiFetch(`/api/auth/users/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) { const e = await res.json(); toast.error(e.error || "Помилка"); return; }
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === editingId ? updated : u)));
        toast.success("Дані користувача оновлено");
      } else {
        const res = await apiFetch("/api/auth/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: trimmedUsername, ...body }),
        });
        if (!res.ok) { const e = await res.json(); toast.error(e.error || "Помилка"); return; }
        const newUser = await res.json();
        setUsers((prev) => [...prev, newUser]);
        toast.success(`Користувача "${trimmedUsername}" створено`);
      }
      resetForm();
    } catch {
      toast.error("Помилка мережі");
    }
  };

  const handleDelete = async (user: UserRecord) => {
    if (user.username === currentUser?.username) { toast.error("Не можна видалити власний акаунт"); return; }
    try {
      const res = await apiFetch(`/api/auth/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "Помилка"); return; }
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success(`Користувача "${user.username}" видалено`);
      if (editingId === user.id) resetForm();
    } catch {
      toast.error("Помилка мережі");
    }
  };

  const handleEnableTotp = async (user: UserRecord) => {
    setTotpLoading(user.id);
    try {
      const res = await apiFetch(`/api/auth/users/${user.id}/totp`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "Помилка"); return; }
      const data = await res.json();
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, totp_enabled: true } : u));
      setTotpSetup({ userId: user.id, username: user.username, qrDataUrl: data.qrDataUrl, secret: data.secret });
    } catch {
      toast.error("Помилка мережі");
    } finally {
      setTotpLoading(null);
    }
  };

  const handleDisableTotp = async (user: UserRecord) => {
    setTotpLoading(user.id);
    try {
      const res = await apiFetch(`/api/auth/users/${user.id}/totp`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "Помилка"); return; }
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, totp_enabled: false } : u));
      toast.success(`2FA вимкнено для "${user.username}"`);
    } catch {
      toast.error("Помилка мережі");
    } finally {
      setTotpLoading(null);
    }
  };

  if (loading) return null;

  return (
    <AppLayout title="Управління користувачами" icon={Users}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Користувачі системи</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {users.length} {users.length === 1 ? "користувач" : users.length < 5 ? "користувачі" : "користувачів"}
            </p>
          </div>
          {!showForm && (
            <Button onClick={handleStartCreate} className="bg-hero-gradient border-0 text-white hover:opacity-90 gap-1.5">
              <Plus className="h-4 w-4" />
              Новий користувач
            </Button>
          )}
        </div>

        {showForm && (
          <Card className="border-primary/30 bg-primary/5 animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {editingId ? <Pencil className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
                {editingId ? "Редагувати користувача" : "Новий користувач"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-4">
                {!editingId && (
                  <div className="space-y-1.5">
                    <Label htmlFor="f-username">Логін</Label>
                    <Input id="f-username" placeholder="username" value={formUsername} onChange={(e) => setFormUsername(e.target.value)} autoFocus />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="f-password">{editingId ? "Новий пароль (залиш порожнім — не змінюється)" : "Пароль"}</Label>
                  <Input id="f-password" type="password" placeholder={editingId ? "••••••" : "password"} value={formPassword} onChange={(e) => setFormPassword(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Роль</Label>
                  <Select value={formRole} onValueChange={(v) => setFormRole(v as "admin" | "user")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Користувач</SelectItem>
                      <SelectItem value="admin">Адміністратор</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-priority">Пріоритет <span className="ml-1 text-xs text-muted-foreground">(1=вищий)</span></Label>
                  <Input id="f-priority" type="number" min={1} max={10} value={formPriority} onChange={(e) => setFormPriority(Math.min(10, Math.max(1, Number(e.target.value) || 5)))} />
                </div>
              </div>

              {formRole === "user" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label>Доступ до інструментів</Label>
                    <div className="flex gap-1 ml-auto">
                      <button type="button" onClick={() => setFormPermissions([...ALL_TOOL_IDS])} className="text-xs text-primary hover:underline">Всі</button>
                      <span className="text-muted-foreground text-xs">/</span>
                      <button type="button" onClick={() => setFormPermissions([])} className="text-xs text-muted-foreground hover:text-foreground hover:underline">Жодного</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_TOOL_IDS.map((tool) => (
                      <label key={tool} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 cursor-pointer hover:bg-secondary/40 transition-colors">
                        <Checkbox checked={formPermissions.includes(tool)} onCheckedChange={() => togglePermission(tool)} />
                        <span className="text-sm">{TOOL_NAMES[tool]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {formRole === "admin" && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Адміністратори мають доступ до всіх інструментів
                </p>
              )}

              <div className="flex items-center gap-2">
                <Button onClick={handleSave} size="sm" className="bg-hero-gradient border-0 text-white hover:opacity-90 gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  {editingId ? "Зберегти" : "Створити"}
                </Button>
                <Button onClick={resetForm} size="sm" variant="ghost" className="gap-1.5">
                  <X className="h-3.5 w-3.5" />
                  Скасувати
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${user.role === "admin" ? "bg-primary/10" : "bg-secondary"}`}>
                      {user.role === "admin" ? <ShieldCheck className="h-4 w-4 text-primary" /> : <UserIcon className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{user.username}</span>
                        {user.username === currentUser?.username && (
                          <Badge variant="outline" className="text-xs py-0 h-4 border-primary/30 text-primary bg-primary/5">Ви</Badge>
                        )}
                        <Badge variant="outline" className={`text-xs py-0 h-4 ${user.role === "admin" ? "border-primary/30 text-primary bg-primary/5" : "border-border text-muted-foreground"}`}>
                          {user.role === "admin" ? "Адміністратор" : "Користувач"}
                        </Badge>
                        <Badge variant="outline" className="text-xs py-0 h-4 border-border text-muted-foreground">P{user.priority ?? 5}</Badge>
                        {user.totp_enabled && (
                          <Badge variant="outline" className="text-xs py-0 h-4 border-green-500/40 text-green-600 bg-green-500/10 gap-0.5">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            2FA
                          </Badge>
                        )}
                      </div>
                      {user.role === "user" && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {user.permissions?.length === ALL_TOOL_IDS.length ? "Всі інструменти" : user.permissions?.length === 0 ? "Немає доступу" : `${user.permissions?.length ?? 0} з ${ALL_TOOL_IDS.length} інструментів`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {user.totp_enabled ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisableTotp(user)}
                        disabled={totpLoading === user.id}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
                        title="Вимкнути 2FA"
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Вимкнути 2FA</span>
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEnableTotp(user)}
                        disabled={totpLoading === user.id}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-green-600 gap-1"
                        title="Налаштувати Google Authenticator"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">2FA</span>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleStartEdit(user)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Редагувати">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(user)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" title="Видалити">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TOTP Setup Dialog */}
      <Dialog open={!!totpSetup} onOpenChange={(open) => { if (!open) setTotpSetup(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              Google Authenticator підключено
            </DialogTitle>
            <DialogDescription>
              Відскануйте QR-код у додатку <strong>Google Authenticator</strong> або <strong>Authy</strong> для акаунту <strong>{totpSetup?.username}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {totpSetup?.qrDataUrl && (
              <div className="rounded-xl border border-border p-3 bg-white">
                <img src={totpSetup.qrDataUrl} alt="TOTP QR Code" className="w-48 h-48" />
              </div>
            )}

            <div className="w-full space-y-1">
              <p className="text-xs text-muted-foreground text-center">або введіть секрет вручну:</p>
              <div
                className="rounded-lg bg-secondary px-3 py-2 font-mono text-sm text-center tracking-widest cursor-pointer select-all hover:bg-secondary/70 transition-colors"
                title="Клікніть, щоб скопіювати"
                onClick={() => {
                  navigator.clipboard.writeText(totpSetup?.secret ?? "");
                  toast.success("Секрет скопійовано");
                }}
              >
                {totpSetup?.secret}
              </div>
            </div>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              Збережіть секрет у надійному місці. Після закриття цього вікна його не можна буде переглянути повторно.
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setTotpSetup(null)} className="w-full bg-hero-gradient border-0 text-white hover:opacity-90">
              Готово
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UsersAdmin;
