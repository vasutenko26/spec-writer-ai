import AppLayout from "@/components/AppLayout";
import LsiAnalyzer from "@/components/tools/LsiAnalyzer";
import { FileBarChart } from "lucide-react";

const LsiTool = () => (
  <AppLayout title="LSI та TF-IDF Аналізатор" icon={FileBarChart}>
    <LsiAnalyzer />
  </AppLayout>
);

export default LsiTool;
