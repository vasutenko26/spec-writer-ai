import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AppStateProvider } from "./contexts/AppStateContext";
import { HistoryProvider } from "./contexts/HistoryContext";
import ProtectedRoute from "./components/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import KnowledgeBase from "./pages/project/KnowledgeBase";
import Hypotheses from "./pages/project/Hypotheses";
import AnomalyAnalysis from "./pages/project/AnomalyAnalysis";
import ContentPlan from "./pages/project/ContentPlan";
import CompetitorIntel from "./pages/project/CompetitorIntel";
import SerpAnalysis from "./pages/SerpAnalysis";
import BriefTool from "./pages/BriefTool";
import ContentTool from "./pages/ContentTool";
import SeoChecker from "./pages/SeoChecker";
import LsiTool from "./pages/LsiTool";
import PageSpeedTool from "./pages/PageSpeedTool";
import SemanticClusterTool from "./pages/SemanticClusterTool";
import SmartLinkingTool from "./pages/SmartLinkingTool";
import CampaignTool from "./pages/CampaignTool";
import KeywordsTool from "./pages/KeywordsTool";
import UsersAdmin from "./pages/UsersAdmin";
import HistoryPage from "./pages/HistoryPage";
import MyContentPage from "./pages/MyContentPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import NotFound from "./pages/NotFound";
import SystemDocs from "./pages/SystemDocs";
import HelpDocs from "./pages/HelpDocs";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppStateProvider>
        <HistoryProvider>
          <TooltipProvider>
            <Sonner richColors position="top-right" />
            <BrowserRouter>
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/sys/platform-docs" element={<SystemDocs />} />
                <Route path="/help" element={<HelpDocs />} />

                {/* Protected */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
                <Route path="/projects/:id" element={<ProtectedRoute><ProjectWorkspace /></ProtectedRoute>}>
                  <Route path="kb" element={<KnowledgeBase />} />
                  <Route path="hypotheses" element={<Hypotheses />} />
                  <Route path="anomalies" element={<AnomalyAnalysis />} />
                  <Route path="content-plan" element={<ContentPlan />} />
                  <Route path="competitors" element={<CompetitorIntel />} />
                </Route>
                <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                <Route path="/my-content" element={<ProtectedRoute><MyContentPage /></ProtectedRoute>} />
                <Route path="/tools/serp" element={<ProtectedRoute><SerpAnalysis /></ProtectedRoute>} />
                <Route path="/tools/brief" element={<ProtectedRoute><BriefTool /></ProtectedRoute>} />
                <Route path="/tools/content" element={<ProtectedRoute><ContentTool /></ProtectedRoute>} />
                <Route path="/tools/seo" element={<ProtectedRoute><SeoChecker /></ProtectedRoute>} />
                <Route path="/tools/lsi" element={<ProtectedRoute><LsiTool /></ProtectedRoute>} />
                <Route path="/tools/pagespeed" element={<ProtectedRoute><PageSpeedTool /></ProtectedRoute>} />
                <Route path="/tools/cluster" element={<ProtectedRoute><SemanticClusterTool /></ProtectedRoute>} />
                <Route path="/tools/linking" element={<ProtectedRoute><SmartLinkingTool /></ProtectedRoute>} />
                <Route path="/tools/campaign" element={<ProtectedRoute><CampaignTool /></ProtectedRoute>} />
                <Route path="/tools/keywords" element={<ProtectedRoute><KeywordsTool /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute><UsersAdmin /></ProtectedRoute>} />
                <Route path="/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />

                {/* Legacy redirect */}
                <Route path="/old-dashboard" element={<Navigate to="/dashboard" replace />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </HistoryProvider>
      </AppStateProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
