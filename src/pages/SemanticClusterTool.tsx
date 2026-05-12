import AppLayout from "@/components/AppLayout";
import SemanticCluster from "@/components/tools/SemanticCluster";
import { Network } from "lucide-react";

const SemanticClusterTool = () => (
  <AppLayout title="Кластеризатор семантики" icon={Network}>
    <SemanticCluster />
  </AppLayout>
);

export default SemanticClusterTool;
