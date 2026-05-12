import AppLayout from "@/components/AppLayout";
import ContentForm from "@/components/ContentForm";
import { Sparkles } from "lucide-react";

const ContentTool = () => (
  <AppLayout title="AI-генерація контенту" icon={Sparkles}>
    <ContentForm />
  </AppLayout>
);

export default ContentTool;
