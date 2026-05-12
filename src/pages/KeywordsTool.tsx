import AppLayout from "@/components/AppLayout";
import KeywordsAnalyzer from "@/components/tools/KeywordsAnalyzer";
import { Tags } from "lucide-react";

const KeywordsTool = () => (
  <AppLayout title="Дослідження ключових слів" icon={Tags}>
    <KeywordsAnalyzer />
  </AppLayout>
);

export default KeywordsTool;
