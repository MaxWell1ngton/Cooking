"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRecipes } from "@/lib/recipes-context";
import { useAuth } from "@/lib/auth/auth-context";
import { exportBackup, type ExportProgress, type ImageFailure } from "@/lib/backup/export";
import {
  parseBackupFile,
  findDuplicateIds,
  performImport,
  type ImportProgress,
  type ImportStrategy,
} from "@/lib/backup/import";
import { ImportDuplicateDialog, type ImportDuplicateDialogHandle } from "@/components/ImportDuplicateDialog";

type ExportState =
  | { status: "idle" }
  | { status: "running"; progress: ExportProgress }
  | { status: "done"; imageFailures: ImageFailure[] }
  | { status: "error"; message: string };

type ImportState =
  | { status: "idle" }
  | { status: "running"; progress: ImportProgress }
  | { status: "done"; imported: number; skipped: number; imageFailures: ImageFailure[] }
  | { status: "error"; message: string };

function ImageFailureNotice({ failures, verb }: { failures: ImageFailure[]; verb: string }) {
  if (failures.length === 0) return null;
  return (
    <p role="alert" className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-500">
      {failures.length} photo{failures.length === 1 ? "" : "s"} couldn&apos;t be {verb}
      {": "}
      {failures.map((f) => f.recipeTitle || "Untitled recipe").join(", ")}. Check the browser console for details.
    </p>
  );
}

export default function SettingsPage() {
  const { recipes, refresh } = useRecipes();
  const { user } = useAuth();
  const [exportState, setExportState] = useState<ExportState>({ status: "idle" });
  const [importState, setImportState] = useState<ImportState>({ status: "idle" });
  const importDialogRef = useRef<ImportDuplicateDialogHandle>(null);

  const handleExport = async () => {
    setExportState({ status: "running", progress: { phase: "images", current: 0, total: 0 } });
    try {
      const result = await exportBackup(recipes, (progress) => setExportState({ status: "running", progress }));
      setExportState({ status: "done", imageFailures: result.imageFailures });
    } catch (error) {
      setExportState({
        status: "error",
        message: error instanceof Error ? error.message : "Something went wrong exporting your backup.",
      });
    }
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!user) {
      setImportState({ status: "error", message: "You need to be signed in to import a backup." });
      return;
    }

    setImportState({ status: "running", progress: { current: 0, total: 0 } });

    const parseResult = await parseBackupFile(file);
    if (!parseResult.ok) {
      setImportState({ status: "error", message: parseResult.error });
      return;
    }

    const existingIds = new Set(recipes.map((recipe) => recipe.id));
    const duplicates = findDuplicateIds(parseResult.parsed.backup, existingIds);

    let strategy: ImportStrategy = "skip";
    if (duplicates.length > 0) {
      const choice = await importDialogRef.current?.open(duplicates.length, parseResult.parsed.backup.recipes.length);
      if (!choice) {
        setImportState({ status: "idle" });
        return;
      }
      strategy = choice;
    }

    try {
      const summary = await performImport(parseResult.parsed, strategy, existingIds, user.id, (progress) =>
        setImportState({ status: "running", progress }),
      );
      await refresh();
      setImportState({
        status: "done",
        imported: summary.imported,
        skipped: summary.skipped,
        imageFailures: summary.imageFailures,
      });
    } catch (error) {
      setImportState({
        status: "error",
        message: error instanceof Error ? error.message : "Something went wrong importing this backup.",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-amber-700 hover:text-amber-800 dark:text-amber-500">
          ← All recipes
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-stone-900 dark:text-stone-100">Settings</h1>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">Export backup</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Download all {recipes.length} of your recipe{recipes.length === 1 ? "" : "s"}, including photos, as a
          single zip file.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exportState.status === "running" || recipes.length === 0}
          className="mt-4 rounded-full bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-60"
        >
          {exportState.status === "running" ? "Preparing backup…" : "Download backup"}
        </button>

        {exportState.status === "running" && (
          <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
            {exportState.progress.phase === "images"
              ? exportState.progress.total > 0
                ? `Downloading photos… (${exportState.progress.current}/${exportState.progress.total})`
                : "Preparing recipes…"
              : `Compressing backup… ${exportState.progress.current}%`}
          </p>
        )}
        {exportState.status === "done" && (
          <div className="mt-3">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Backup downloaded.</p>
            <ImageFailureNotice failures={exportState.imageFailures} verb="included in the backup" />
          </div>
        )}
        {exportState.status === "error" && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
            {exportState.message}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">Import backup</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Restore recipes (and their photos) from a previously exported backup zip.
        </p>

        <input
          type="file"
          accept=".zip,application/zip"
          onChange={handleFileSelected}
          className="hidden"
          id="backup-file-input"
          disabled={importState.status === "running"}
        />
        <label
          htmlFor="backup-file-input"
          className={`mt-4 inline-block cursor-pointer rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800 ${
            importState.status === "running" ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {importState.status === "running" ? "Importing…" : "Choose backup file"}
        </label>

        {importState.status === "running" && (
          <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
            {importState.progress.total > 0
              ? `Importing recipe ${importState.progress.current} of ${importState.progress.total}…`
              : "Reading backup file…"}
          </p>
        )}
        {importState.status === "done" && (
          <div className="mt-3">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Imported {importState.imported} recipe{importState.imported === 1 ? "" : "s"}
              {importState.skipped > 0 ? ` (skipped ${importState.skipped} already in your account)` : ""}.
            </p>
            <ImageFailureNotice failures={importState.imageFailures} verb="restored" />
          </div>
        )}
        {importState.status === "error" && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
            {importState.message}
          </p>
        )}
      </section>

      <ImportDuplicateDialog ref={importDialogRef} />
    </div>
  );
}
