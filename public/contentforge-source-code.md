# ContentForge — Полный исходный код проекта

## Структура проекта

```
├── index.html
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── postcss.config.js
├── eslint.config.js
├── components.json
├── README.md
├── public/
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── BriefForm.tsx
│   │   ├── BriefResult.tsx
│   │   ├── ContentForm.tsx
│   │   ├── NavLink.tsx
│   │   └── ui/ (shadcn компоненты)
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── integrations/supabase/
│   │   ├── client.ts
│   │   └── types.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Index.tsx
│   │   ├── Dashboard.tsx
│   │   ├── LandingPage.tsx
│   │   └── NotFound.tsx
│   └── test/
│       ├── setup.ts
│       └── example.test.ts
└── supabase/
    ├── config.toml
    └── functions/
        ├── generate-brief/index.ts
        └── generate-content/index.ts
```

---

## index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lovable App</title>
    <meta name="description" content="Lovable Generated Project">
    <meta name="author" content="Lovable" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/042284ab-d783-4388-a5b5-83b087a1e100/id-preview-d67450c1--ed38ba06-dec1-43c8-a223-897f2d8b664a.lovable.app-1773143627111.png">
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@Lovable" />
    <meta name="twitter:image" content="https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/042284ab-d783-4388-a5b5-83b087a1e100/id-preview-d67450c1--ed38ba06-dec1-43c8-a223-897f2d8b664a.lovable.app-1773143627111.png">
    <meta property="og:title" content="Lovable App">
    <meta name="twitter:title" content="Lovable App">
    <meta property="og:description" content="Lovable Generated Project">
    <meta name="twitter:description" content="Lovable Generated Project">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## package.json

```json
{
  "name": "vite_react_shadcn_ts",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@radix-ui/react-accordion": "^1.2.11",
    "@radix-ui/react-alert-dialog": "^1.1.14",
    "@radix-ui/react-aspect-ratio": "^1.1.7",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.2",
    "@radix-ui/react-collapsible": "^1.1.11",
    "@radix-ui/react-context-menu": "^2.2.15",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-hover-card": "^1.1.14",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-menubar": "^1.1.15",
    "@radix-ui/react-navigation-menu": "^1.2.13",
    "@radix-ui/react-popover": "^1.1.14",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-radio-group": "^1.3.7",
    "@radix-ui/react-scroll-area": "^1.2.9",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slider": "^1.3.5",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.5",
    "@radix-ui/react-tabs": "^1.1.12",
    "@radix-ui/react-toast": "^1.2.14",
    "@radix-ui/react-toggle": "^1.1.9",
    "@radix-ui/react-toggle-group": "^1.1.10",
    "@radix-ui/react-tooltip": "^1.2.7",
    "@supabase/supabase-js": "^2.98.0",
    "@tanstack/react-query": "^5.83.0",
    "@types/file-saver": "^2.0.7",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.6.0",
    "file-saver": "^2.0.5",
    "input-otp": "^1.4.2",
    "jszip": "^3.10.1",
    "lucide-react": "^0.462.0",
    "next-themes": "^0.3.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.61.1",
    "react-markdown": "^10.1.0",
    "react-resizable-panels": "^2.1.9",
    "react-router-dom": "^6.30.1",
    "recharts": "^2.15.4",
    "sonner": "^1.7.4",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^0.9.9",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@eslint/js": "^9.32.0",
    "@tailwindcss/typography": "^0.5.19",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@types/node": "^22.16.5",
    "@types/react": "^18.3.23",
    "@types/react-dom": "^18.3.7",
    "@vitejs/plugin-react-swc": "^3.11.0",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.32.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^15.15.0",
    "jsdom": "^20.0.3",
    "lovable-tagger": "^1.1.13",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.3",
    "typescript-eslint": "^8.38.0",
    "vite": "^5.4.19",
    "vitest": "^3.2.4"
  }
}
```

---

## vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

---

## vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

---

## tailwind.config.ts

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
```

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "allowJs": true,
    "noImplicitAny": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "paths": {
      "@/*": ["./src/*"]
    },
    "skipLibCheck": true,
    "strictNullChecks": false
  },
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

---

## tsconfig.app.json

```json
{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleDetection": "force",
    "moduleResolution": "bundler",
    "noEmit": true,
    "noFallthroughCasesInSwitch": false,
    "noImplicitAny": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "paths": {
      "@/*": ["./src/*"]
    },
    "skipLibCheck": true,
    "strict": false,
    "target": "ES2020",
    "types": ["vitest/globals"],
    "useDefineForClassFields": true
  },
  "include": ["src"]
}
```

---

## tsconfig.node.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

---

## postcss.config.js

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

## eslint.config.js

```javascript
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
```

---

## components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

---

## src/main.tsx

```typescript
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

---

## src/App.tsx

```typescript
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
```

---

## src/index.css

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 98%;
    --foreground: 220 20% 10%;

    --card: 0 0% 100%;
    --card-foreground: 220 20% 10%;

    --popover: 0 0% 100%;
    --popover-foreground: 220 20% 10%;

    --primary: 160 84% 39%;
    --primary-foreground: 0 0% 100%;

    --secondary: 220 14% 96%;
    --secondary-foreground: 220 20% 10%;

    --muted: 220 14% 96%;
    --muted-foreground: 220 10% 46%;

    --accent: 160 84% 39%;
    --accent-foreground: 0 0% 100%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 160 84% 39%;

    --radius: 0.75rem;

    --sidebar-background: 220 20% 10%;
    --sidebar-foreground: 220 14% 96%;
    --sidebar-primary: 160 84% 39%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 220 15% 18%;
    --sidebar-accent-foreground: 220 14% 96%;
    --sidebar-border: 220 15% 20%;
    --sidebar-ring: 160 84% 39%;

    --hero-gradient: linear-gradient(135deg, hsl(160 84% 39%), hsl(180 70% 35%));
    --surface-elevated: 0 0% 100%;
    --surface-sunken: 220 14% 96%;
  }

  .dark {
    --background: 220 20% 7%;
    --foreground: 220 14% 96%;
    --card: 220 20% 10%;
    --card-foreground: 220 14% 96%;
    --popover: 220 20% 10%;
    --popover-foreground: 220 14% 96%;
    --primary: 160 84% 45%;
    --primary-foreground: 0 0% 100%;
    --secondary: 220 15% 18%;
    --secondary-foreground: 220 14% 96%;
    --muted: 220 15% 18%;
    --muted-foreground: 220 10% 55%;
    --accent: 220 15% 18%;
    --accent-foreground: 220 14% 96%;
    --destructive: 0 62% 30%;
    --destructive-foreground: 0 0% 100%;
    --border: 220 15% 20%;
    --input: 220 15% 20%;
    --ring: 160 84% 45%;
    --sidebar-background: 220 20% 5%;
    --sidebar-foreground: 220 14% 96%;
    --sidebar-primary: 160 84% 45%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 220 15% 12%;
    --sidebar-accent-foreground: 220 14% 96%;
    --sidebar-border: 220 15% 15%;
    --sidebar-ring: 160 84% 45%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
    font-family: 'Inter', system-ui, sans-serif;
  }
}

@layer utilities {
  .text-gradient {
    @apply bg-clip-text text-transparent;
    background-image: var(--hero-gradient);
  }
  .bg-hero-gradient {
    background-image: var(--hero-gradient);
  }
}
```

---

## src/App.css

```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}
```

---

## src/vite-env.d.ts

```typescript
/// <reference types="vite/client" />
```

---

## src/lib/utils.ts

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## src/pages/LandingPage.tsx

```typescript
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
```

---

## src/pages/Dashboard.tsx

```typescript
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Sparkles } from "lucide-react";
import BriefForm from "@/components/BriefForm";
import ContentForm from "@/components/ContentForm";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container flex items-center justify-between py-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-hero-gradient">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">ContentForge</span>
          </button>
        </div>
      </header>

      <div className="container py-8 max-w-4xl">
        <Tabs defaultValue="brief" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="brief" className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              Створити ТЗ (Brief)
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" />
              Генерація контенту
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brief">
            <BriefForm />
          </TabsContent>

          <TabsContent value="content">
            <ContentForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
```

---

## src/pages/Index.tsx

```typescript
const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to Your Blank App</h1>
        <p className="text-xl text-muted-foreground">Start building your amazing project here!</p>
      </div>
    </div>
  );
};

export default Index;
```

---

## src/pages/NotFound.tsx

```typescript
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
```

---

## src/components/BriefForm.tsx

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BriefResult from "./BriefResult";

const BriefForm = () => {
  const [keyword, setKeyword] = useState("");
  const [language, setLanguage] = useState("uk");
  const [region, setRegion] = useState("ua");
  const [contentType, setContentType] = useState("article");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-brief", {
        body: { keyword, language, region, contentType },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data.content);
    } catch (e: any) {
      console.error("Brief generation error:", e);
      toast.error(e.message || "Помилка генерації ТЗ");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Параметри для аналізу
          </CardTitle>
          <CardDescription>
            Введіть ключове слово та параметри для створення ТЗ на основі AI-аналізу
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keyword">Ключове слово / тема</Label>
            <Input
              id="keyword"
              placeholder="Наприклад: як вибрати ноутбук для роботи"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Мова контенту</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="uk">Українська</SelectItem>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Регіон</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ua">Україна</SelectItem>
                  <SelectItem value="us">США</SelectItem>
                  <SelectItem value="eu">Європа</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Тип контенту</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Стаття</SelectItem>
                  <SelectItem value="landing">Лендінг</SelectItem>
                  <SelectItem value="product">Картка товару</SelectItem>
                  <SelectItem value="category">Категорія</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!keyword.trim() || isLoading}
            className="w-full bg-hero-gradient border-0 text-primary-foreground hover:opacity-90"
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI аналізує та створює ТЗ...</>
            ) : (
              <><FileText className="mr-2 h-4 w-4" /> Створити ТЗ</>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && <BriefResult content={result} />}
    </div>
  );
};

export default BriefForm;
```

---

## src/components/BriefResult.tsx

```typescript
import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check, List, X, Archive } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const BriefResult = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);
  const [showToc, setShowToc] = useState(true);
  const [activeId, setActiveId] = useState("");

  const toc = useMemo(() => {
    const items: TocItem[] = [];
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.match(/^(#{2,4})\s+(.+)/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/[^\wа-яіїєґ\d]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        items.push({ id, text, level });
      }
    }
    return items;
  }, [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "technical-brief.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportZip = async () => {
    const zip = new JSZip();
    zip.file("technical-brief.md", content);

    const htmlContent = `<!DOCTYPE html>
<html lang="uk"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Технічне завдання</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1a1a1a}
h1,h2,h3{margin-top:1.5em}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}
th{background:#f5f5f5}ul,ol{padding-left:1.5em}</style></head><body>${content}</body></html>`;
    zip.file("technical-brief.html", htmlContent);
    zip.file("technical-brief.txt", content.replace(/[#*`|_\-\[\]]/g, ""));

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "technical-brief.zip");
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );

    toc.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  const generateHeadingId = (text: string) =>
    text.toLowerCase().replace(/[^\wа-яіїєґ\d]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowToc(!showToc)} className="text-xs">
            {showToc ? <X className="mr-1 h-3.5 w-3.5" /> : <List className="mr-1 h-3.5 w-3.5" />}
            {showToc ? "Сховати зміст" : "Зміст"}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs">
            {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
            {copied ? "Скопійовано" : "Копіювати"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="text-xs">
            <Download className="mr-1 h-3.5 w-3.5" />
            .md
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportZip} className="text-xs">
            <Archive className="mr-1 h-3.5 w-3.5" />
            .zip
          </Button>
        </div>
      </div>

      {/* Document layout */}
      <div className="flex gap-0 rounded-xl border border-border bg-card overflow-hidden">
        {/* TOC Sidebar */}
        {showToc && toc.length > 0 && (
          <aside className="w-72 shrink-0 border-r border-border bg-secondary/30 p-4 overflow-y-auto max-h-[80vh] hidden md:block">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Зміст документу</p>
            <nav className="space-y-0.5">
              {toc.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`block w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors truncate ${
                    item.level === 3 ? "pl-5" : item.level === 4 ? "pl-8" : ""
                  } ${
                    activeId === item.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* Content area */}
        <div className="flex-1 p-8 md:p-10 overflow-y-auto max-h-[80vh]">
          <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-h2:text-xl prose-h2:font-bold prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:mb-4 prose-h2:mt-8 prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-6 prose-h4:text-base prose-h4:font-medium prose-table:text-xs prose-th:bg-secondary prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-1.5 prose-td:border-border prose-th:border-border">
            <ReactMarkdown
              components={{
                h2: ({ children, ...props }) => {
                  const text = typeof children === "string" ? children : String(children);
                  const id = generateHeadingId(text);
                  return <h2 id={id} {...props}>{children}</h2>;
                },
                h3: ({ children, ...props }) => {
                  const text = typeof children === "string" ? children : String(children);
                  const id = generateHeadingId(text);
                  return <h3 id={id} {...props}>{children}</h3>;
                },
                h4: ({ children, ...props }) => {
                  const text = typeof children === "string" ? children : String(children);
                  const id = generateHeadingId(text);
                  return <h4 id={id} {...props}>{children}</h4>;
                },
                table: ({ children, ...props }) => (
                  <div className="overflow-x-auto rounded-lg border border-border my-4">
                    <table className="w-full" {...props}>{children}</table>
                  </div>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
};

export default BriefResult;
```

---

## src/components/ContentForm.tsx

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Copy, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ContentForm = () => {
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState("informational");
  const [wordCount, setWordCount] = useState([2500]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { topic, keywords, tone, wordCount: wordCount[0] },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data.content);
    } catch (e: any) {
      console.error("Content generation error:", e);
      toast.error(e.message || "Помилка генерації контенту");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Параметри генерації
          </CardTitle>
          <CardDescription>
            Налаштуйте параметри для AI-генерації SEO-оптимізованого контенту
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="topic">Тема статті</Label>
            <Input
              id="topic"
              placeholder="Наприклад: Як вибрати ноутбук для роботи у 2026 році"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Ключові слова (через кому)</Label>
            <Textarea
              id="keywords"
              placeholder="ноутбук для роботи, вибір ноутбука, найкращі ноутбуки 2026"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Тон тексту</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="informational">Інформаційний</SelectItem>
                  <SelectItem value="commercial">Комерційний</SelectItem>
                  <SelectItem value="expert">Експертний</SelectItem>
                  <SelectItem value="casual">Розмовний</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Обсяг: {wordCount[0]} слів</Label>
              <Slider
                value={wordCount}
                onValueChange={setWordCount}
                min={500}
                max={5000}
                step={500}
                className="mt-3"
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!topic.trim() || isLoading}
            className="w-full bg-hero-gradient border-0 text-primary-foreground hover:opacity-90"
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI генерує контент...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Згенерувати контент</>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Згенерований контент
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Скопійовано" : "Копіювати"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border bg-secondary/50 p-6">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{result}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContentForm;
```

---

## src/components/NavLink.tsx

```typescript
import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
```

---

## src/hooks/use-mobile.tsx

```typescript
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
```

---

## src/hooks/use-toast.ts

```typescript
import * as React from "react";

import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"];
    };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

type Toast = Omit<ToasterToast, "id">;

function toast({ ...props }: Toast) {
  const id = genId();

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id: id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };
```

---

## src/integrations/supabase/client.ts

```typescript
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

---

## src/test/setup.ts

```typescript
import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
```

---

## src/test/example.test.ts

```typescript
import { describe, it, expect } from "vitest";

describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
```

---

## supabase/functions/generate-brief/index.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ENGINE_IDS: Record<string, number> = {
  ua: 1830,
  us: 1,
  eu: 17,
};

interface ScrapedPage {
  url: string;
  title: string;
  position: number;
  wordCount: number;
  imageCount: number;
  h1: string[];
  h2: string[];
  h3: string[];
}

async function scrapePage(url: string): Promise<Omit<ScrapedPage, 'url' | 'title' | 'position'> | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "uk,en;q=0.9",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) return null;

    for (const tag of ["script", "style", "nav", "footer", "header", "aside"]) {
      doc.querySelectorAll(tag).forEach((el: any) => el.remove());
    }

    const bodyText = (doc.querySelector("body")?.textContent || "").replace(/\s+/g, " ").trim();
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

    const imageCount = doc.querySelectorAll("img").length;

    const extractHeadings = (tag: string): string[] => {
      const headings: string[] = [];
      doc.querySelectorAll(tag).forEach((el: any) => {
        const text = (el.textContent || "").trim();
        if (text && text.length < 200) headings.push(text);
      });
      return headings;
    };

    return {
      wordCount,
      imageCount,
      h1: extractHeadings("h1"),
      h2: extractHeadings("h2"),
      h3: extractHeadings("h3"),
    };
  } catch (e) {
    console.warn(`Failed to scrape ${url}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

async function scrapeCompetitors(serpResults: any[]): Promise<ScrapedPage[]> {
  const pages: ScrapedPage[] = [];

  const urls = serpResults.slice(0, 10).map((item, i) => ({
    url: item.url || item.link || "",
    title: item.title || "N/A",
    position: item.position || (i + 1),
  }));

  const scrapePromises = urls.map(async ({ url, title, position }) => {
    if (!url || url === "N/A") return null;
    const scraped = await scrapePage(url);
    if (!scraped) return { url, title, position, wordCount: 0, imageCount: 0, h1: [], h2: [], h3: [] };
    return { url, title, position, ...scraped };
  });

  const results = await Promise.all(scrapePromises);
  for (const r of results) {
    if (r) pages.push(r);
  }

  return pages;
}

function formatScrapedTable(pages: ScrapedPage[]): string {
  if (!pages.length) return "";

  let table = "| № | URL | Title | Слів | H1 | H2 | H3 | Зображень |\n|---|-----|-------|------|----|----|----|-----------|\n";
  pages.forEach((p, i) => {
    const shortUrl = p.url.length > 50 ? p.url.substring(0, 47) + "..." : p.url;
    const title = (p.title || "N/A").replace(/\|/g, "\\|").substring(0, 60);
    table += `| ${i + 1} | ${shortUrl} | ${title} | ${p.wordCount} | ${p.h1.length} | ${p.h2.length} | ${p.h3.length} | ${p.imageCount} |\n`;
  });
  return table;
}

function formatHeadingsDetail(pages: ScrapedPage[]): string {
  let detail = "";
  pages.forEach((p, i) => {
    if (p.h1.length === 0 && p.h2.length === 0 && p.h3.length === 0) return;
    detail += `\n**Конкурент ${i + 1}** (${p.url}):\n`;
    if (p.h1.length) detail += `- H1: ${p.h1.map(h => `"${h}"`).join(", ")}\n`;
    if (p.h2.length) detail += `- H2 (${p.h2.length}): ${p.h2.slice(0, 15).map(h => `"${h}"`).join(", ")}${p.h2.length > 15 ? "..." : ""}\n`;
    if (p.h3.length) detail += `- H3 (${p.h3.length}): ${p.h3.slice(0, 10).map(h => `"${h}"`).join(", ")}${p.h3.length > 10 ? "..." : ""}\n`;
  });
  return detail;
}

async function fetchSerpFromSeRanking(keyword: string, region: string, apiKey: string): Promise<any[] | null> {
  const engineId = ENGINE_IDS[region] || ENGINE_IDS.ua;

  try {
    console.log(`Creating SERP task for "${keyword}" with engine_id ${engineId}`);
    const createRes = await fetch("https://api.seranking.com/v1/serp/tasks", {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ engine_id: engineId, query: [keyword] }),
    });

    if (!createRes.ok) {
      console.error("SE Ranking create task error:", createRes.status, await createRes.text());
      return null;
    }

    const createData = await createRes.json();
    const firstItem = Array.isArray(createData) ? createData[0] : createData;
    const taskId = firstItem?.task_id || firstItem?.data?.task_id || firstItem?.id;
    if (!taskId) {
      console.error("No task_id in response:", JSON.stringify(createData));
      return null;
    }

    const maxAttempts = 18;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      console.log(`Polling SERP task ${taskId}, attempt ${i + 1}/${maxAttempts}`);

      const statusRes = await fetch(`https://api.seranking.com/v1/serp/tasks/status?task_id=${taskId}`, {
        headers: { "Authorization": `Token ${apiKey}` },
      });

      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      const status = statusData?.status || statusData?.data?.status;

      if (status === "done" || status === "completed") {
        const results = statusData?.results || statusData?.data?.results || statusData?.data || [];
        const items = Array.isArray(results) ? results : (results?.items || results?.organic || []);
        return items.slice(0, 10);
      }

      if (status === "error" || status === "failed") {
        console.error("SERP task failed:", JSON.stringify(statusData));
        return null;
      }
    }

    console.warn("SERP task polling timeout");
    return null;
  } catch (e) {
    console.error("SE Ranking API error:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { keyword, language, region, contentType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SE_RANKING_API_KEY = Deno.env.get("SE_RANKING_API_KEY");

    const langMap: Record<string, string> = { uk: "українською мовою", ru: "на русском языке", en: "in English" };
    const typeMap: Record<string, string> = { article: "інформаційна стаття", landing: "лендінг/посадкова сторінка", product: "картка товару", category: "сторінка категорії" };
    const regionMap: Record<string, string> = { ua: "Україна", us: "USA", eu: "Europe" };

    let serpResults: any[] | null = null;
    if (SE_RANKING_API_KEY) {
      console.log("Fetching SERP data from SE Ranking...");
      serpResults = await fetchSerpFromSeRanking(keyword, region, SE_RANKING_API_KEY);
    }

    let scrapedPages: ScrapedPage[] = [];
    let scrapedTable = "";
    let headingsDetail = "";

    if (serpResults && serpResults.length > 0) {
      console.log(`Scraping ${serpResults.length} competitor pages...`);
      scrapedPages = await scrapeCompetitors(serpResults);
      scrapedTable = formatScrapedTable(scrapedPages);
      headingsDetail = formatHeadingsDetail(scrapedPages);
      console.log(`Successfully scraped ${scrapedPages.filter(p => p.wordCount > 0).length}/${scrapedPages.length} pages`);
    }

    const serpSection = scrapedPages.length > 0
      ? `\n\nРЕАЛЬНІ ДАНІ КОНКУРЕНТІВ (ТОП-10 Google) для "${keyword}":\n\nТаблиця конкурентів:\n${scrapedTable}\n\nДетальна структура заголовків конкурентів:\n${headingsDetail}\n\nВикористай ці РЕАЛЬНІ дані у розділах 3.2, 3.3, 3.5. Аналізуй реальну кількість слів, заголовків та зображень для рекомендацій.`
      : serpResults && serpResults.length > 0
        ? `\n\nДані SERP (URL та Title) для "${keyword}" отримано, але скрапінг сторінок не вдався. Доповни таблицю на основі своїх знань.`
        : `\nРеальних даних SERP немає. Вигадай реалістичні дані для 10 конкурентів у розділі 3.2.`;

    const systemPrompt = `Ти — досвідчений SEO-стратег та контент-менеджер з 10+ років досвіду. Створюєш детальні технічні завдання (ТЗ) для копірайтерів, які виглядають як професійний документ.
Відповідай ${langMap[language] || "українською мовою"}.
Формат відповіді — Markdown з чіткою нумерацією розділів та підрозділів.
Використовуй ## для основних розділів (1, 2, 3...) та ### для підрозділів (3.1, 3.2...) та #### для під-підрозділів (3.1.1, 3.1.2...).`;

    const userPrompt = `Створи детальне професійне технічне завдання (ТЗ) для написання контенту на тему: "${keyword}"

Параметри:
- Тип контенту: ${typeMap[contentType] || contentType}
- Регіон: ${regionMap[region] || region}
${serpSection}

ТЗ повинно мати таку ТОЧНУ структуру з нумерацією:

## 1) Мета та результат
Опиши мету створення контенту, що має бути на виході. Вкажи тип контенту та цільову аудиторію.

## 2) Основні ролі
- **Адмін**: що робить адмін
- **Користувач/Копірайтер**: що має зробити

## 3) Функціональні вимоги

### 3.1 Вхідні дані
Які дані потрібні для написання (ключове слово, регіон, мова, тип контенту тощо).

### 3.2 SERP-конкуренти (ТОП-10)
${scrapedPages.length > 0 ? "Використай надані РЕАЛЬНІ дані скрапінгу конкурентів:" : serpResults && serpResults.length > 0 ? "Використай надані дані SERP та доповни:" : "Проаналізуй ТОП-10 видачі та створи таблицю:"}
| № | URL | Title | Кількість слів | H2 | H3 | Зображення |

### 3.3 Рекомендовані параметри тексту
На основі аналізу конкурентів дай рекомендації у вигляді таблиці:
| Параметр | Мінімум | Рекомендовано | Максимум |
Включи: кількість слів, символів, H2, H3, абзаців, зображень, списків, таблиць.

### 3.4 Ключові слова конкурентів
Таблиця LSI/семантичних ключових слів (мінімум 20 штук):
| Ключове слово | Частотність | Рекомендована кількість вживань |

### 3.5 Структура заголовків (H1-H3)
${scrapedPages.length > 0 ? "На основі РЕАЛЬНИХ заголовків конкурентів створи оптимальну структуру:" : "Детальна рекомендована структура статті з усіма заголовками H1, H2, H3."}
Для кожного заголовка напиши короткий опис що має бути в розділі.

### 3.6 Посилання
Рекомендації щодо внутрішньої та зовнішньої перелінковки. Скільки посилань, якого типу, на які сторінки.

### 3.7 Питання (FAQ / People Also Ask)
Список із 5-8 питань які часто задають користувачі по цій темі. Ці питання мають бути інтегровані в контент або в блок FAQ.

### 3.8 Мета-теги та slug
Рекомендації для:
- **Title** (до 60 символів) — 2-3 варіанти
- **Meta Description** (до 160 символів) — 2-3 варіанти
- **URL slug** — рекомендований

### 3.9 Вимоги до контенту
- Унікальність: мінімум X%
- Читабельність: рівень за шкалою Flesch
- Тон тексту
- E-E-A-T вимоги
- Щільність ключового слова: X-X%

### 3.10 Експорт / формат здачі
В якому форматі має бути здано (Google Docs, HTML, Markdown тощо).

ВАЖЛИВО: Дотримуйся нумерації розділів. Кожен розділ має бути інформативним та конкретним. Таблиці використовуй де зазначено.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Перевищено ліміт запитів. Спробуйте пізніше." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Необхідно поповнити кредити AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const responseText = await response.text();
    if (!responseText) throw new Error("Empty response from AI gateway");
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse AI response:", responseText.substring(0, 500));
      throw new Error("Invalid JSON from AI gateway");
    }
    const content = data.choices?.[0]?.message?.content || "Не вдалося згенерувати ТЗ.";

    return new Response(JSON.stringify({
      content,
      serpDataUsed: serpResults !== null && serpResults.length > 0,
      pagesScraped: scrapedPages.filter(p => p.wordCount > 0).length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-brief error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

## supabase/functions/generate-content/index.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, keywords, tone, wordCount } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const toneMap: Record<string, string> = {
      informational: "інформаційний, нейтральний, навчальний",
      commercial: "комерційний, переконливий, з закликами до дії",
      expert: "експертний, глибокий, з технічними деталями",
      casual: "розмовний, дружній, легкий для сприйняття",
    };

    const systemPrompt = `Ти — професійний SEO-копірайтер з 10+ років досвіду. Пишеш унікальний, корисний та SEO-оптимізований контент українською мовою.
Формат — Markdown з правильною ієрархією заголовків (H1, H2, H3).
Контент повинен бути структурований, з таблицями, списками, FAQ.`;

    const userPrompt = `Напиши SEO-оптимізовану статтю на тему: "${topic}"

Параметри:
- Обсяг: приблизно ${wordCount} слів
- Тон: ${toneMap[tone] || tone}
${keywords ? `- Ключові слова для інтеграції: ${keywords}` : ""}

Вимоги:
1. Привабливий вступ з хуком
2. Мінімум 5-7 розділів з H2 заголовками
3. Використовуй H3 для підрозділів
4. Додай списки, таблиці порівняння де доречно
5. Розділ FAQ з 4-5 питаннями
6. Сильний висновок з CTA
7. Природна інтеграція ключових слів (density 1.5-2.5%)
8. Контент має відповідати E-E-A-T принципам`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Перевищено ліміт запитів. Спробуйте пізніше." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Необхідно поповнити кредити AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Не вдалося згенерувати контент.";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

*Примечание: UI-компоненты shadcn (src/components/ui/*) не включены, так как это стандартные компоненты библиотеки shadcn/ui.*
