import AppLayout from "@/components/AppLayout";
import SmartLinking from "@/components/tools/SmartLinking";
import { Link2 } from "lucide-react";

const SmartLinkingTool = () => (
  <AppLayout title="Розумна перелінковка" icon={Link2}>
    <SmartLinking />
  </AppLayout>
);

export default SmartLinkingTool;
