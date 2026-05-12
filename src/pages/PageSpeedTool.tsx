import AppLayout from "@/components/AppLayout";
import PageSpeedAudit from "@/components/tools/PageSpeedAudit";
import { Gauge } from "lucide-react";

const PageSpeedTool = () => (
  <AppLayout title="Технічний SEO-аудит" icon={Gauge}>
    <PageSpeedAudit />
  </AppLayout>
);

export default PageSpeedTool;
