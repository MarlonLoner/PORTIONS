import { AlertTriangle, Bot, CheckCircle2, Database, FileSpreadsheet, ShieldCheck, UploadCloud } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ImportTemplateActions } from "@/components/import-template-actions";
import { getImportBatchesData } from "@/lib/data";
import {
  getImportBatchAiSummary,
  getImportBatchMetrics,
  getImportBatchStatus,
  importBatchStatusClasses,
  importBatchStatusLabels,
} from "@/lib/import-batches";
import {
  getAiImportAdvisor,
  getDataQualityRules,
  getImportFlowSteps,
  getImportOverview,
  getImportTemplates,
  getTemplateCsvHeader,
  getTemplateExampleRow,
  type ImportDifficulty,
  type ImportImportance
} from "@/lib/imports";

export const dynamic = "force-dynamic";

const difficultyClasses: Record<ImportDifficulty, string> = {
  Easy: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200",
  Advanced: "bg-rose-50 text-rose-700 ring-rose-200"
};

const importanceClasses: Record<ImportImportance, string> = {
  Required: "bg-navy-950 text-white ring-navy-900",
  Optional: "bg-slate-100 text-slate-700 ring-slate-200"
};

export default function ImportsPage() {
  const overview = getImportOverview();
  const templates = getImportTemplates();
  const rules = getDataQualityRules();
  const flow = getImportFlowSteps();
  const advisor = getAiImportAdvisor();
  const batchesPromise = getImportBatchesData();

  return <ImportsPageContent overview={overview} templates={templates} rules={rules} flow={flow} advisor={advisor} batchesPromise={batchesPromise} />;
}

async function ImportsPageContent({
  overview,
  templates,
  rules,
  flow,
  advisor,
  batchesPromise
}: {
  overview: ReturnType<typeof getImportOverview>;
  templates: ReturnType<typeof getImportTemplates>;
  rules: ReturnType<typeof getDataQualityRules>;
  flow: ReturnType<typeof getImportFlowSteps>;
  advisor: string;
  batchesPromise: ReturnType<typeof getImportBatchesData>;
}) {
  const batches = await batchesPromise;
  const batchMetrics = getImportBatchMetrics(batches);
  const recentBatches = batches.slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-7 xl:grid-cols-[1.08fr_0.92fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
              Pilot Data Readiness
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Import Templates</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Prepare pharmacy data for chronic patients, stock, branches, staff, orders, and follow-up workflows before launching a PORTIONS pilot.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/imports/upload" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-clinical-50">
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                Upload CSV batch
              </Link>
              <Link href="/imports/batches" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">
                <Database className="h-4 w-4" aria-hidden="true" />
                Review import batches
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">Data readiness score</p>
            <p className="mt-3 text-5xl font-semibold tracking-tight">{overview.dataReadinessScore}%</p>
            <div className="mt-5 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-emerald-300" style={{ width: `${overview.dataReadinessScore}%` }} />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-200">{overview.suggestedNextAction}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <HeroMetric label="Templates available" value={String(overview.templatesAvailable)} />
        <HeroMetric label="Required imports" value={String(overview.requiredImports)} />
        <HeroMetric label="Optional imports" value={String(overview.optionalImports)} />
        <HeroMetric label="Estimated setup time" value={overview.estimatedSetupTime} />
        <HeroMetric label="Readiness score" value={`${overview.dataReadinessScore}%`} />
        <HeroMetric label="Next action" value={overview.suggestedNextAction} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <Panel title="Import Command" eyebrow="Start here" icon={<UploadCloud className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <ActionTile
              title="Upload new batch"
              description="Preview headers, row quality, branch naming, dates, and numeric fields before any pilot import approval."
              href="/imports/upload"
              cta="Open upload preview"
            />
            <ActionTile
              title="Review saved batches"
              description="Track readiness, cleanup issues, approvals, and imported history from one batch review queue."
              href="/imports/batches"
              cta="Open batch review"
            />
          </div>
          <div className="mt-4 rounded-lg bg-clinical-50 p-4 ring-1 ring-clinical-100">
            <p className="text-sm font-semibold text-clinical-900">Supported data types</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {templates.map((template) => (
                <span key={template.id} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-clinical-800 ring-1 ring-clinical-100">
                  {template.name}
                </span>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Recent Batch Status" eyebrow="Review requirements" icon={<AlertTriangle className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Saved batches" value={String(batchMetrics.totalBatches)} />
            <MiniMetric label="Needs cleanup" value={String(batchMetrics.needsCleanup)} />
            <MiniMetric label="Approved" value={String(batchMetrics.approved)} />
          </div>
          <div className="mt-4 space-y-3">
            {recentBatches.length > 0 ? (
              recentBatches.map((batch) => {
                const status = getImportBatchStatus(batch);
                return (
                  <div key={batch.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-navy-950">{formatTemplateName(batch.templateType)}</p>
                        <p className="mt-1 text-xs text-slate-500">{batch.fileName}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${importBatchStatusClasses[status]}`}>
                        {importBatchStatusLabels[status]}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{getImportBatchAiSummary(batch)}</p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>{batch.rowCount} rows</span>
                      <span>{batch.readinessScore}% readiness</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
                No import batches have been saved yet. Upload a CSV batch to start validation and pilot cleanup review.
              </p>
            )}
          </div>
        </Panel>
      </section>

      <section className="space-y-4">
        <SectionHeader eyebrow="Template cards" title="Implementation-Ready Import Templates" helper="Each template includes required fields, optional fields, source guidance, CSV headers, and an example row for pilot preparation." />
        <div className="grid gap-5 xl:grid-cols-2">
          {templates.map((template) => {
            const headers = getTemplateCsvHeader(template);
            const exampleRow = getTemplateExampleRow(template);

            return (
              <article key={template.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-navy-950">{template.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{template.purpose}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={difficultyClasses[template.difficulty]} label={template.difficulty} />
                    <Badge className={importanceClasses[template.importance]} label={template.importance} />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <MiniMetric label="Required fields" value={String(template.requiredFields.length)} />
                  <MiniMetric label="Optional fields" value={String(template.optionalFields.length)} />
                  <MiniMetric label="Source system" value={template.suggestedSource} />
                </div>
                {template.id === "chronic-patients" ? (
                  <p className="mt-4 rounded-lg bg-clinical-50 p-3 text-sm font-semibold leading-6 text-clinical-900 ring-1 ring-clinical-100">
                    If you do not know the exact next refill date, provide refill_cycle_days. PORTIONS can estimate the first schedule during pilot setup.
                  </p>
                ) : null}

                <ImportTemplateActions templateId={template.id} templateName={template.name} headers={headers} exampleRow={exampleRow} />
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <SectionHeader eyebrow="CSV field viewer" title="Required And Optional Fields" helper="Use these field names exactly in the first row of the CSV template." />
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {templates.map((template) => (
            <article key={template.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-navy-950">{template.name}</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FieldGroup title="Required" fields={template.requiredFields} tone="required" />
                <FieldGroup title="Optional" fields={template.optionalFields} tone="optional" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Data Quality Rules" eyebrow="Clean import rules" icon={<ShieldCheck className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            {rules.map((rule) => (
              <div key={rule} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <p className="text-sm font-medium leading-6 text-slate-700">{rule}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Import Flow" eyebrow="Five-step process" icon={<UploadCloud className="h-5 w-5" />}>
          <div className="grid gap-3">
            {flow.map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-950 text-sm font-semibold text-white">{index + 1}</span>
                <p className="text-sm font-semibold text-navy-950">{step}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)]">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-white/10 p-3 text-clinical-100 ring-1 ring-white/15">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">AI Import Advisor</p>
            <p className="mt-3 text-base leading-7 text-slate-100">{advisor}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ActionTile({
  title,
  description,
  href,
  cta
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-base font-semibold text-navy-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <Link href={href} className="focus-ring mt-4 inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
        {cta}
      </Link>
    </article>
  );
}

function formatTemplateName(templateType: string) {
  return templateType
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 line-clamp-2 text-lg font-semibold leading-6 text-navy-950">{value}</p>
    </article>
  );
}

function SectionHeader({ eyebrow, title, helper }: { eyebrow: string; title: string; helper: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">{title}</h2>
      </div>
      <p className="max-w-xl text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-navy-950">{value}</p>
    </div>
  );
}

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${className}`}>{label}</span>;
}

function FieldGroup({ title, fields, tone }: { title: string; fields: string[]; tone: "required" | "optional" }) {
  return (
    <div>
      <p className={tone === "required" ? "text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700" : "text-xs font-semibold uppercase tracking-[0.1em] text-slate-500"}>{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {fields.map((field) => (
          <span key={field} className={tone === "required" ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100" : "rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"}>
            {field}
          </span>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, eyebrow, icon, children }: { title: string; eyebrow: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-clinical-700">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.12em]">{eyebrow}</p>
      </div>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
