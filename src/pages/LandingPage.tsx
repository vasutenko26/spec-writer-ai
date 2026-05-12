import { Search, FileText, Sparkles, BarChart3, ArrowRight, CheckCircle, Shield, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const tools = [
  {
    step: "01",
    icon: Search,
    title: "Аналіз пошукової видачі",
    description: "Глибокий аналіз ТОП-10 конкурентів: структура матеріалів, семантичне ядро, обсяг контенту та заголовкова архітектура.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    step: "02",
    icon: FileText,
    title: "Автоматизоване ТЗ для копірайтера",
    description: "Формує детальне технічне завдання з оптимальними параметрами, вимогами до структури та семантики на основі реального аналізу ринку.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    step: "03",
    icon: Sparkles,
    title: "Інтелектуальна генерація контенту",
    description: "Створює SEO-оптимізовану статтю з урахуванням конкурентного ландшафту, вимог до структури та цільових метрик.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    step: "04",
    icon: BarChart3,
    title: "Комплексна SEO-перевірка",
    description: "Аналізує готовий матеріал: обсяг, щільність ключових слів, структуру заголовків та відповідність SEO-стандартам.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
];

const benefits = [
  "Глибокий аналіз пошукової видачі та конкурентів",
  "Автоматизоване створення детальних ТЗ для копірайтерів",
  "Розумна генерація контенту з урахуванням SEO-метрик",
  "Надійна екосистема без витоків даних",
  "Збереження результатів та передача між інструментами",
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleCta = () => navigate(isAuthenticated ? "/dashboard" : "/login");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between py-4 max-w-6xl">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-hero-gradient">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">ContentForge</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/help")} className="text-muted-foreground hover:text-foreground gap-1.5 text-sm">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Довідник</span>
            </Button>
            <Button onClick={handleCta} className="bg-hero-gradient border-0 text-white hover:opacity-90">
              {isAuthenticated ? "Відкрити платформу" : "Увійти"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 md:py-28 text-center max-w-6xl">
        <div className="mx-auto max-w-3xl animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-primary" />
            Закрита корпоративна платформа для SEO-фахівців
          </div>

          <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Від аналізу конкурентів
            <br />
            до <span className="text-gradient">готової публікації</span>
          </h1>

          <p className="mb-10 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Повний цикл роботи з SEO-контентом: аналіз ринку, розробка стратегії,
            генерація матеріалів та контроль якості — в єдиній захищеній екосистемі.
          </p>

          {/* Main CTA */}
          <Button
            size="lg"
            onClick={handleCta}
            className="bg-hero-gradient border-0 text-white hover:opacity-90 text-base px-10 py-6 shadow-lg shadow-primary/20"
          >
            {isAuthenticated ? "Відкрити Dashboard" : "Увійти до платформи"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Tools */}
      <section className="container pb-20 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Чотири інструменти. Один робочий процес.</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Кожен інструмент вирішує конкретне завдання і передає результати наступному
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {tools.map((tool) => (
            <div
              key={tool.step}
              className="group relative rounded-xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/30"
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tool.bg}`}>
                  <tool.icon className={`h-5 w-5 ${tool.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{tool.step}</span>
                    <h3 className="font-semibold text-base">{tool.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t border-border bg-secondary/30">
        <div className="container py-16 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-4">Корпоративний рівень надійності</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                ContentForge — закрита платформа для команд, яким важливі якість контенту,
                захист даних та прозорість робочих процесів.
              </p>
              <ul className="space-y-3">
                {benefits.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleCta}
                className="bg-hero-gradient border-0 text-white hover:opacity-90 text-base px-8"
              >
                {isAuthenticated ? "Перейти до Dashboard" : "Розпочати роботу"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6">
        <div className="container text-center text-sm text-muted-foreground max-w-6xl">
          © 2026 ContentForge — Корпоративна платформа для SEO та контент-маркетингу
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
