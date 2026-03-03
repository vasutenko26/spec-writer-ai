import { FileText, Sparkles, Search, BarChart3, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: Search,
    title: "SERP-аналіз конкурентів",
    description: "Збір ТОП-10 конкурентів, аналіз структури, ключових слів та мета-даних",
  },
  {
    icon: FileText,
    title: "Генерація ТЗ (Brief)",
    description: "Автоматичне формування технічного завдання для копірайтера з усіма параметрами",
  },
  {
    icon: Sparkles,
    title: "AI-генерація контенту",
    description: "Створення тексту за ТЗ через AI з урахуванням SEO-вимог та структури",
  },
  {
    icon: BarChart3,
    title: "SEO-перевірки",
    description: "Аналіз якості, читабельності, унікальності та відповідності SEO-метрикам",
  },
  {
    icon: Globe,
    title: "Автопублікація",
    description: "Публікація готового контенту в WordPress або Shopify одним кліком",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-hero-gradient">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">ContentForge</span>
          </div>
          <Button onClick={() => navigate("/dashboard")} className="bg-hero-gradient border-0 text-primary-foreground hover:opacity-90">
            Почати роботу
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-24 text-center">
        <div className="mx-auto max-w-3xl animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Сервіс автоконтенту на базі AI
          </div>
          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Від ключового слова
            <br />
            до <span className="text-gradient">готової публікації</span>
          </h1>
          <p className="mb-10 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Створюйте технічні завдання, генеруйте SEO-оптимізований контент та публікуйте його автоматично — все в одному сервісі.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate("/dashboard")} className="bg-hero-gradient border-0 text-primary-foreground hover:opacity-90 text-base px-8 py-6">
              Створити ТЗ
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/dashboard")} className="text-base px-8 py-6">
              Генерувати контент
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container pb-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/30"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 ContentForge. Сервіс автоматизації контенту.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
