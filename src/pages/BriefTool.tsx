import AppLayout from "@/components/AppLayout";
import BriefForm from "@/components/BriefForm";
import { FileText } from "lucide-react";

const BriefTool = () => (
  <AppLayout title="Генерація ТЗ (Brief)" icon={FileText}>
    <BriefForm />
  </AppLayout>
);

export default BriefTool;
