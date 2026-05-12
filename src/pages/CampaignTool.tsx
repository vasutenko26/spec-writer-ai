import AppLayout from "@/components/AppLayout";
import Campaign from "@/components/tools/Campaign";
import { Rocket } from "lucide-react";

const CampaignTool = () => (
  <AppLayout title="Автоматична SEO-кампанія" icon={Rocket}>
    <Campaign />
  </AppLayout>
);

export default CampaignTool;
