"use client";

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import type { ImportStrategy } from "@/lib/backup/import";

export interface ImportDuplicateDialogHandle {
  /** Shows the dialog and resolves with the user's choice, or null if they cancelled/dismissed it. */
  open: (duplicateCount: number, totalCount: number) => Promise<ImportStrategy | null>;
}

const optionButtonClass =
  "rounded-xl border border-stone-300 px-4 py-3 text-left text-sm font-medium text-stone-800 hover:border-amber-500 hover:bg-amber-50 dark:border-stone-700 dark:text-stone-200 dark:hover:border-amber-600 dark:hover:bg-amber-950";

export const ImportDuplicateDialog = forwardRef<ImportDuplicateDialogHandle, object>(
  function ImportDuplicateDialog(_props, ref) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const resolveRef = useRef<((strategy: ImportStrategy | null) => void) | null>(null);
    const [counts, setCounts] = useState({ duplicates: 0, total: 0 });

    useImperativeHandle(ref, () => ({
      open: (duplicateCount, totalCount) => {
        setCounts({ duplicates: duplicateCount, total: totalCount });
        dialogRef.current?.showModal();
        return new Promise((resolve) => {
          resolveRef.current = resolve;
        });
      },
    }));

    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      // Catches Escape/backdrop dismissal. If a button already resolved the
      // promise, this is a harmless no-op — a Promise only ever settles once.
      const handleClose = () => {
        resolveRef.current?.(null);
        resolveRef.current = null;
      };
      dialog.addEventListener("close", handleClose);
      return () => dialog.removeEventListener("close", handleClose);
    }, []);

    const choose = (strategy: ImportStrategy | null) => {
      resolveRef.current?.(strategy);
      resolveRef.current = null;
      dialogRef.current?.close();
    };

    return (
      <dialog
        ref={dialogRef}
        className="w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-stone-200 bg-white p-0 text-stone-900 shadow-xl backdrop:bg-stone-900/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
      >
        <div className="p-6">
          <h2 className="font-serif text-xl font-semibold">Some recipes already exist</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {counts.duplicates} of {counts.total} recipe{counts.total === 1 ? "" : "s"} in this backup{" "}
            {counts.duplicates === 1 ? "matches one you already have" : "match recipes you already have"}. What
            would you like to do?
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button type="button" onClick={() => choose("skip")} className={optionButtonClass}>
              Skip duplicates
              <span className="block text-xs font-normal text-stone-500 dark:text-stone-400">
                Keep your existing recipes as they are; only import the new ones.
              </span>
            </button>
            <button type="button" onClick={() => choose("overwrite")} className={optionButtonClass}>
              Overwrite existing recipes
              <span className="block text-xs font-normal text-stone-500 dark:text-stone-400">
                Replace matching recipes with the versions from this backup.
              </span>
            </button>
            <button type="button" onClick={() => choose("copy")} className={optionButtonClass}>
              Import everything as new copies
              <span className="block text-xs font-normal text-stone-500 dark:text-stone-400">
                Add every recipe from the backup as a separate, independent copy.
              </span>
            </button>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => choose(null)}
              className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </dialog>
    );
  },
);
