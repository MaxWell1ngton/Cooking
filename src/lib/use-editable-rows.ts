"use client";

import { useCallback, useEffect, useRef } from "react";
import { KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

interface Identifiable {
  id: string;
}

/**
 * Shared behavior for an editable, reorderable list of rows: drag-and-drop
 * sensors + reordering, removing a row, and focusing a specific row's input
 * right after it's added (used for "Enter adds a new entry and focuses it").
 */
export function useEditableRows<T extends Identifiable>(rows: T[], onChange: (rows: T[]) => void) {
  const pendingFocusId = useRef<string | null>(null);
  const inputRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!pendingFocusId.current) return;
    const el = inputRefs.current.get(pendingFocusId.current);
    pendingFocusId.current = null;
    el?.focus();
  }, [rows]);

  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) inputRefs.current.set(id, el);
    else inputRefs.current.delete(id);
  }, []);

  // Commits a new set of rows and focuses the input registered under `id`
  // once React has re-rendered with it.
  const focusAfterChange = useCallback(
    (id: string, nextRows: T[]) => {
      pendingFocusId.current = id;
      onChange(nextRows);
    },
    [onChange],
  );

  const remove = useCallback((id: string) => onChange(rows.filter((row) => row.id !== id)), [rows, onChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = rows.findIndex((row) => row.id === active.id);
      const newIndex = rows.findIndex((row) => row.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      onChange(arrayMove(rows, oldIndex, newIndex));
    },
    [rows, onChange],
  );

  return { registerRef, focusAfterChange, remove, sensors, handleDragEnd };
}
