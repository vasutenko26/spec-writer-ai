import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { FileText, ChevronLeft, LogOut, History, Plug, BookOpen } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  icon?: React.ElementType;
}

const AppLayout = ({ children, title, icon: Icon }: AppLayoutProps) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container flex items-center justify-between py-3 max-w-5xl">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground gap-1 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">Dashboard</span>
            </Button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              {Icon && <Icon className="h-4 w-4 text-primary" />}
              <span className="font-semibold text-sm">{title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-hero-gradient">
                <FileText className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold hidden sm:block">ContentForge</span>
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/history")}
              className="h-8 text-muted-foreground hover:text-foreground text-xs gap-1 px-2"
              title="Моя Історія"
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Історія</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/integrations")}
              className="h-8 text-muted-foreground hover:text-foreground text-xs gap-1 px-2"
              title="Інтеграції (WordPress та ін.)"
            >
              <Plug className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Інтеграції</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/help")}
              className="h-8 text-muted-foreground hover:text-foreground text-xs gap-1 px-2"
              title="Довідник"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Довідник</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { logout(); navigate("/login"); }}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Вийти"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-5xl">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
