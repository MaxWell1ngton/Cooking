"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";

export interface ConfirmDialogHandle {
  open: () => void;
  close: () => void;
}

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export const ConfirmDialog = forwardRef<ConfirmDialogHandle, ConfirmDialogProps>(
  function ConfirmDialog(
    { title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", destructive, onConfirm },
    ref,
  ) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useImperativeHandle(ref, () => ({
      open: () => dialogRef.current?.showModal(),
      close: () => dialogRef.current?.close(),
    }));

    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const handleCancel = (event: Event) => event.preventDefault();
      dialog.addEventListener("cancel", handleCancel);
      return () => dialog.removeEventListener("cancel", handleCancel);
    }, []);

    return (
      <dialog
        ref={dialogRef}
        className="w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-stone-200 bg-white p-0 text-stone-900 shadow-xl backdrop:bg-stone-900/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
      >
        <div className="p-6">
          <h2 className="font-serif text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {description}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                dialogRef.current?.close();
                onConfirm();
              }}
              className={
                destructive
                  ? "rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  : "rounded-full bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
              }
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    );
  },
);
