import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, AlertCircle, ShieldCheck, ArrowLeft } from "lucide-react";

const LoginPage = () => {
  const { login, verifyTotp, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);

    if (result.requires2fa && result.tempToken) {
      setTempToken(result.tempToken);
      setStep("2fa");
      setTimeout(() => codeRef.current?.focus(), 50);
    } else if (result.ok) {
      navigate(from, { replace: true });
    } else {
      setError("Невірний логін або пароль");
    }
  };

  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = totpCode.replace(/\s/g, "");
    if (code.length !== 6) { setError("Введіть 6-значний код"); return; }
    setError("");
    setLoading(true);
    const ok = await verifyTotp(tempToken, code);
    setLoading(false);
    if (ok) {
      navigate(from, { replace: true });
    } else {
      setError("Невірний код. Перевірте Google Authenticator та спробуйте ще раз.");
      setTotpCode("");
      codeRef.current?.focus();
    }
  };

  const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setTotpCode(val);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-hero-gradient shadow-lg">
            {step === "2fa"
              ? <ShieldCheck className="h-7 w-7 text-white" />
              : <FileText className="h-7 w-7 text-white" />
            }
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">ContentForge</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {step === "2fa" ? "Підтвердження входу" : "Вхід до системи"}
            </p>
          </div>
        </div>

        {/* Credentials form */}
        {step === "credentials" && (
          <form onSubmit={handleCredentials} className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="username">Логін</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading || !username || !password} className="w-full bg-hero-gradient border-0 text-white hover:opacity-90">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Вхід...</> : "Увійти"}
            </Button>
          </form>
        )}

        {/* 2FA form */}
        {step === "2fa" && (
          <form onSubmit={handleTotp} className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
            <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 px-3 py-3">
              <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Відкрийте <strong className="text-foreground">Google Authenticator</strong> і введіть 6-значний код для акаунту{" "}
                <strong className="text-foreground">{username}</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totp-code">Код підтвердження</Label>
              <Input
                id="totp-code"
                ref={codeRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="000000"
                value={totpCode}
                onChange={handleCodeInput}
                maxLength={6}
                className="text-center text-2xl tracking-[0.5em] font-mono h-12"
                autoComplete="one-time-code"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading || totpCode.length !== 6} className="w-full bg-hero-gradient border-0 text-white hover:opacity-90">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Перевірка...</> : "Підтвердити"}
            </Button>

            <button
              type="button"
              onClick={() => { setStep("credentials"); setError(""); setTotpCode(""); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
            >
              <ArrowLeft className="h-3 w-3" />
              Повернутись до входу
            </button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          © 2026 ContentForge — сервіс автоматизації SEO-контенту
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
