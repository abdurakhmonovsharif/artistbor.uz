"use client";

import { useState } from "react";
import html2pdf from "html2pdf.js";
import { CheckCircle2, FileUp, Loader2, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { adminPrimaryActionButtonClass } from "@/components/admin/admin-action-button";
import { useToast } from "@/components/ui/toast";
import { filesApi, type UploadedFileRecord } from "@/lib/api/admin-content";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

type FileCategory = "image" | "video" | "audio" | "document";

const categoryRules: Record<FileCategory, { accept: string; maxSize: number }> = {
  image: { accept: ".jpg,.jpeg,.png,.gif,.webp", maxSize: 10 * 1024 * 1024 },
  video: { accept: ".mp4,.mov,.avi", maxSize: 100 * 1024 * 1024 },
  audio: { accept: ".mp3,.wav,.ogg", maxSize: 50 * 1024 * 1024 },
  document: { accept: ".pdf,.doc,.docx,.html,.htm", maxSize: 20 * 1024 * 1024 },
};

export default function FileUploadPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [category, setCategory] = useState<FileCategory>("image");
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<UploadedFileRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [converting, setConverting] = useState(false);
  const rule = categoryRules[category];

  const chooseFiles = async (nextFiles: File[]) => {
    if (nextFiles.length > 10) {
      toast.error(t("fileUpload.tooMany"));
      return;
    }
    const invalid = nextFiles.find((file) => file.size > rule.maxSize);
    if (invalid) {
      toast.error(`${invalid.name}: ${formatBytes(rule.maxSize)} ${t("fileUpload.maxSize")}`);
      return;
    }
    setConverting(true);
    try {
      const convertedFiles = await Promise.all(nextFiles.map((file) => convertHtmlFile(file)));
      const oversized = convertedFiles.find((file) => file.size > rule.maxSize);
      if (oversized) {
        toast.error(`${oversized.name}: ${formatBytes(rule.maxSize)} ${t("fileUpload.maxSize")}`);
        return;
      }
      setFiles(convertedFiles);
      setUploaded([]);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t("fileUpload.conversionFailed"));
    } finally {
      setConverting(false);
    }
  };

  const upload = async () => {
    if (!files.length) {
      toast.error(t("fileUpload.selectFiles"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await filesApi.upload(files, category);
      setUploaded(Array.isArray(result) ? result : [result]);
      setFiles([]);
      toast.success(t("fileUpload.success"));
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t("fileUpload.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("menu.fileUpload")}
        title={t("fileUpload.title")}
        description={t("fileUpload.description")}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <div className="rounded-2xl border border-artistbor-border bg-artistbor-surface p-5 shadow-(--artistbor-surface-shadow) sm:p-6">
          <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-end">
            <div className="flex flex-col gap-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-artistbor-secondary">
                  {t("fileUpload.category")}
                </span>
                <select
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value as FileCategory);
                    setFiles([]);
                    setUploaded([]);
                  }}
                  className="h-11 w-full rounded-lg border border-artistbor-border bg-background px-3 text-sm font-semibold text-artistbor-primary outline-none focus:border-amber-400"
                >
                  <option value="image">{t("fileUpload.image")}</option>
                  <option value="video">{t("fileUpload.video")}</option>
                  <option value="audio">{t("fileUpload.audio")}</option>
                  <option value="document">{t("fileUpload.document")}</option>
                </select>
              </label>

              <button type="button" onClick={() => void upload()} disabled={submitting || converting || !files.length} className={cn(adminPrimaryActionButtonClass, "w-full sm:w-auto")}>
                {submitting || converting ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
                {converting ? t("fileUpload.converting") : submitting ? t("fileUpload.uploading") : t("fileUpload.submit")}
              </button>
            </div>

            <label className={cn("flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-5 text-center transition hover:bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/5 dark:hover:bg-amber-400/10", (submitting || converting) && "pointer-events-none opacity-60")}>
              <FileUp className="size-6 text-amber-600 dark:text-amber-300" />
              <span className="mt-2 text-sm font-bold text-artistbor-primary">{t("fileUpload.choose")}</span>
              <span className="mt-1 text-xs text-artistbor-secondary">
                {category === "image" ? t("fileUpload.imageHint") : `${rule.accept.replaceAll(".", "").replaceAll(",", ", ")} · ${t("fileUpload.maxTen")}`}
              </span>
              <input
                type="file"
                accept={rule.accept}
                multiple
                disabled={submitting || converting}
                className="sr-only"
                onChange={(event) => {
                  void chooseFiles(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          {files.length ? (
            <div className="mt-5 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-artistbor-secondary">{t("fileUpload.selected")}</p>
              {files.map((file) => (
                <div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 rounded-lg border border-artistbor-border bg-background px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold text-artistbor-primary">{file.name}</span>
                  <span className="shrink-0 text-xs text-artistbor-secondary">{formatBytes(file.size)}</span>
                  <button type="button" onClick={() => setFiles((current) => current.filter((item) => item !== file))} className="text-artistbor-secondary hover:text-rose-600" aria-label={t("actions.delete")}>
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

        </div>

        <div className="rounded-2xl border border-artistbor-border bg-artistbor-surface p-5 shadow-(--artistbor-surface-shadow) sm:p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <h2 className="text-base font-bold text-artistbor-primary">{t("fileUpload.responseTitle")}</h2>
          </div>
          {!uploaded.length ? (
            <p className="mt-4 text-sm leading-6 text-artistbor-secondary">{t("fileUpload.responseEmpty")}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {uploaded.map((file, index) => {
                const url = file.url || file.file_url;
                return (
                  <div key={`${file.id ?? file.file_id ?? index}-${url ?? "file"}`} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-400/20 dark:bg-emerald-400/5">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                      <dt className="font-bold text-artistbor-secondary">ID</dt><dd className="break-all text-artistbor-primary">{file.id ?? file.file_id ?? "-"}</dd>
                      <dt className="font-bold text-artistbor-secondary">MIME</dt><dd className="break-all text-artistbor-primary">{file.mime_type ?? "-"}</dd>
                      <dt className="font-bold text-artistbor-secondary">{t("fileUpload.size")}</dt><dd className="text-artistbor-primary">{formatBytes(file.size)}</dd>
                    </dl>
                    {url ? <a href={url} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm font-bold text-amber-700 underline underline-offset-2 dark:text-amber-300">{url}</a> : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatBytes(value: unknown) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function convertHtmlFile(file: File) {
  if (!/\.html?$/i.test(file.name)) return file;

  const html = await file.text();
  const container = document.createElement("div");
  container.innerHTML = html;
  Object.assign(container.style, {
    background: "#ffffff",
    color: "#111827",
    left: "-100000px",
    padding: "24px",
    position: "fixed",
    top: "0",
    width: "794px",
  });
  document.body.appendChild(container);

  try {
    const pdfBlob = await html2pdf()
      .set({
        html2canvas: { scale: 2, useCORS: true },
        image: { quality: 0.95, type: "jpeg" },
        jsPDF: { format: "a4", orientation: "portrait", unit: "mm" },
        margin: 10,
      })
      .from(container)
      .toPdf()
      .outputPdf("blob");

    return new File([pdfBlob], file.name.replace(/\.html?$/i, ".pdf"), {
      type: "application/pdf",
    });
  } finally {
    container.remove();
  }
}