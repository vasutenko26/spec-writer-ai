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
