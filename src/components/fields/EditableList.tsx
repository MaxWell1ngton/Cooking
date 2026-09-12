"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createId } from "@/lib/id";
import { useEditableRows } from "@/lib/use-editable-rows";
import { groupLinkToken } from "@/lib/step-group-links";
import { DragHandle } from "./DragHandle";

export interface ListRow {
  id: string;
  value: string;
}

export interface GroupOption {
  id: string;
  name: string;
}

interface EditableListProps {
  label: string;
  rows: ListRow[];
  onChange: (rows: ListRow[]) => void;
  placeholder?: string;
  multiline?: boolean;
  addLabel?: string;
  /** Numbered + drag-to-reorder (used for Steps; Variations don't need either). */
  ordered?: boolean;
  /** When given (and non-empty), each row gets an "insert group link" control — used for Steps only. */
  groups?: GroupOption[];
}

const fieldClass =
  "flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

export function EditableList({
  label,
  rows,
  onChange,
  placeholder,
  multiline,
  addLabel = "Add",
  ordered,
  groups,
}: EditableListProps) {
  const { registerRef, focusAfterChange, remove, sensors, handleDragEnd } = useEditableRows(rows, onChange);
  // dnd-kit generates internal ids for accessibility descriptions; without a
  // stable id here, server and client can disagree on them and React logs a
  // hydration mismatch. useId() is deterministic across SSR/CSR.
  const dndId = useId();

  const update = (id: string, value: string) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, value } : row)));

  const addAfter = (index: number) => {
    const row: ListRow = { id: createId(), value: "" };
    focusAfterChange(row.id, [...rows.slice(0, index + 1), row, ...rows.slice(index + 1)]);
  };

  const add = () => {
    const row: ListRow = { id: createId(), value: "" };
    focusAfterChange(row.id, [...rows, row]);
  };

  const handleKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    if (event.shiftKey) {
      // Multiline fields get a real line break (default behavior). A
      // single-line field has nothing to insert, so just swallow it —
      // otherwise Enter would submit the surrounding form.
      if (!multiline) event.preventDefault();
      return;
    }
    event.preventDefault();
    addAfter(index);
  };

  const rowProps = {
    multiline,
    placeholder,
    groups,
    onKeyDown: handleKeyDown,
    onChangeValue: update,
    onRemove: remove,
    registerRef,
  };

  return (
    <fieldset>
      <legend className="text-sm font-medium text-stone-700 dark:text-stone-300">{label}</legend>
      {ordered ? (
        <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-2 space-y-2">
              {rows.map((row, index) => (
                <SortableRow key={row.id} row={row} index={index} {...rowProps} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="mt-2 space-y-2">
          {rows.map((row, index) => (
            <PlainRow key={row.id} row={row} index={index} {...rowProps} />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={add}
        className="mt-2 text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-amber-500"
      >
        + {addLabel}
      </button>
    </fieldset>
  );
}

interface RowProps {
  row: ListRow;
  index: number;
  multiline?: boolean;
  placeholder?: string;
  groups?: GroupOption[];
  onChangeValue: (id: string, value: string) => void;
  onKeyDown: (event: KeyboardEvent, index: number) => void;
  onRemove: (id: string) => void;
  registerRef: (id: string, el: HTMLElement | null) => void;
}

function RowField({
  row,
  multiline,
  placeholder,
  index,
  onChangeValue,
  onKeyDown,
  registerRef,
  extraRef,
}: RowProps & { extraRef?: (el: HTMLTextAreaElement | HTMLInputElement | null) => void }) {
  const combinedRef = (el: HTMLTextAreaElement | HTMLInputElement | null) => {
    registerRef(row.id, el);
    extraRef?.(el);
  };

  return multiline ? (
    <textarea
      ref={combinedRef}
      value={row.value}
      onChange={(event) => onChangeValue(row.id, event.target.value)}
      onKeyDown={(event) => onKeyDown(event, index)}
      placeholder={placeholder}
      rows={2}
      className={`${fieldClass} min-h-[2.5rem] resize-y leading-relaxed`}
    />
  ) : (
    <input
      ref={combinedRef}
      type="text"
      value={row.value}
      onChange={(event) => onChangeValue(row.id, event.target.value)}
      onKeyDown={(event) => onKeyDown(event, index)}
      placeholder={placeholder}
      className={fieldClass}
    />
  );
}

/** "+ Insert group link" control shown under a step's textarea, when the recipe has any groups to link to. */
function InsertGroupLinkControl({ groups, onInsert }: { groups: GroupOption[]; onInsert: (groupId: string) => void }) {
  return (
    <select
      value=""
      onChange={(event) => {
        if (event.target.value) onInsert(event.target.value);
      }}
      aria-label="Insert ingredient group link"
      className="mt-1 rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-500 hover:border-amber-500 hover:text-amber-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:text-amber-500"
    >
      <option value="">+ Insert group link</option>
      {groups.map((group) => (
        <option key={group.id} value={group.id}>
          {group.name.trim() || "(unnamed group)"}
        </option>
      ))}
    </select>
  );
}

function PlainRow(props: RowProps) {
  return (
    <div className="flex items-start gap-2">
      <RowField {...props} />
      <button
        type="button"
        onClick={() => props.onRemove(props.row.id)}
        aria-label="Remove item"
        className="rounded-lg p-1.5 text-stone-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
      >
        ✕
      </button>
    </div>
  );
}

function SortableRow(props: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.row.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingCursorRef = useRef<number | null>(null);

  // Runs after the value we just spliced a token into actually reaches the
  // DOM, so the cursor lands right after the inserted link instead of
  // wherever the browser happens to leave it.
  useEffect(() => {
    if (pendingCursorRef.current === null) return;
    const pos = pendingCursorRef.current;
    pendingCursorRef.current = null;
    const textarea = textareaRef.current;
    textarea?.focus();
    textarea?.setSelectionRange(pos, pos);
  }, [props.row.value]);

  const insertGroupLink = (groupId: string) => {
    const textarea = textareaRef.current;
    const currentValue = props.row.value;
    const start = textarea?.selectionStart ?? currentValue.length;
    const end = textarea?.selectionEnd ?? currentValue.length;
    const token = groupLinkToken(groupId);
    pendingCursorRef.current = start + token.length;
    props.onChangeValue(props.row.id, currentValue.slice(0, start) + token + currentValue.slice(end));
  };

  const showGroupLinkControl = props.multiline && props.groups && props.groups.length > 0;

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 rounded-lg bg-stone-50 dark:bg-stone-950">
      <span className="mt-2.5 w-5 shrink-0 text-right text-sm text-stone-400">{props.index + 1}.</span>
      <DragHandle {...attributes} {...listeners} />
      <div className="flex flex-1 flex-col items-start gap-1">
        <div className="w-full">
          <RowField {...props} extraRef={(el) => (textareaRef.current = el as HTMLTextAreaElement | null)} />
        </div>
        {showGroupLinkControl && <InsertGroupLinkControl groups={props.groups!} onInsert={insertGroupLink} />}
      </div>
      <button
        type="button"
        onClick={() => props.onRemove(props.row.id)}
        aria-label="Remove item"
        className="rounded-lg p-1.5 text-stone-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
      >
        ✕
      </button>
    </div>
  );
}
