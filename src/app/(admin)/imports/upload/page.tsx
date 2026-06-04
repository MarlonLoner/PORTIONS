import { ImportUploadPreview } from "@/components/import-upload-preview";
import { getSettingsData } from "@/lib/data";
import { getImportTemplates } from "@/lib/imports";

export const dynamic = "force-dynamic";

export default async function ImportUploadPage() {
  const settings = await getSettingsData();
  const templates = getImportTemplates();
  const branchNames = settings.branches.map((branch) => branch.name);

  return <ImportUploadPreview templates={templates} branchNames={branchNames} />;
}
