"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEditableRows } from "@/lib/use-editable-rows";
import { createBlankIngredient, type IngredientsValue } from "@/lib/ingredient-groups";
import { createId } from "@/lib/id";
import type { Ingredient } from "@/types/recipe";
import { DragHandle } from "./DragHandle";

interface IngredientFieldsProps {
  value: IngredientsValue;
  onChange: (value: IngredientsValue) => void;
}

const fieldClass =
  "rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

export function IngredientFields({ value, onChange }: IngredientFieldsProps) {
  const { ungrouped, groups } = value;
  const pendingGroupFocusId = useRef<string | null>(null);
  const groupNameRefs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (!pendingGroupFocusId.current) return;
    const el = groupNameRefs.current.get(pendingGroupFocusId.current);
    pendingGroupFocusId.current = null;
    el?.focus();
  }, [groups]);

  const addGroup = () => {
    const group = { id: createId(), name: "", ingredients: [createBlankIngredient()] };
    pendingGroupFocusId.current = group.id;
    onChange({ ungrouped, groups: [...groups, group] });
  };

  const renameGroup = (groupId: string, name: string) =>
    onChange({ ungrouped, groups: groups.map((group) => (group.id === groupId ? { ...group, name } : group)) });

  const removeGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    onChange({
      ungrouped: group ? [...ungrouped, ...group.ingredients] : ungrouped,
      groups: groups.filter((g) => g.id !== groupId),
    });
  };

  const handleGroupNameKeyDown = (event: KeyboardEvent) => {
    // A group name is a single-line field with no "add next entry" meaning —
    // just stop Enter from submitting the whole recipe form.
    if (event.key === "Enter") event.preventDefault();
  };

  return (
    <fieldset className="space-y-5">
      <legend className="text-sm font-medium text-stone-700 dark:text-stone-300">Ingredients</legend>

      <IngredientRowList rows={ungrouped} onChange={(rows) => onChange({ ungrouped: rows, groups })} />

      {groups.map((group) => (
        <div key={group.id} className="rounded-xl border border-stone-200 p-3 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <input
              ref={(el) => {
                if (el) groupNameRefs.current.set(group.id, el);
                else groupNameRefs.current.delete(group.id);
              }}
              value={group.name}
              onChange={(event) => renameGroup(group.id, event.target.value)}
              onKeyDown={handleGroupNameKeyDown}
              placeholder="Group name, e.g. Dry mix"
              className={`${fieldClass} flex-1 font-medium`}
            />
            <button
              type="button"
              onClick={() => removeGroup(group.id)}
              aria-label={`Remove group${group.name ? ` "${group.name}"` : ""}`}
              className="shrink-0 rounded-lg p-1.5 text-stone-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            >
              ✕
            </button>
          </div>
          <div className="mt-3">
            <IngredientRowList
              rows={group.ingredients}
              onChange={(rows) =>
                onChange({ ungrouped, groups: groups.map((g) => (g.id === group.id ? { ...g, ingredients: rows } : g)) })
              }
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addGroup}
        className="text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-amber-500"
      >
        + Add ingredient group
      </button>
    </fieldset>
  );
}

function IngredientRowList({ rows, onChange }: { rows: Ingredient[]; onChange: (rows: Ingredient[]) => void }) {
  const { registerRef, focusAfterChange, remove, sensors, handleDragEnd } = useEditableRows(rows, onChange);
  // Stable across SSR/CSR so dnd-kit's internal a11y ids don't mismatch on hydration.
  const dndId = useId();

  const addAfter = (index: number) => {
    const row = createBlankIngredient();
    focusAfterChange(row.id, [...rows.slice(0, index + 1), row, ...rows.slice(index + 1)]);
  };

  const add = () => {
    const row = createBlankIngredient();
    focusAfterChange(row.id, [...rows, row]);
  };

  const update = (id: string, patch: Partial<Ingredient>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const handleKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (event.shiftKey) return;
    addAfter(index);
  };

  return (
    <div>
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {rows.map((ingredient, index) => (
              <SortableIngredientRow
                key={ingredient.id}
                ingredient={ingredient}
                onChange={(patch) => update(ingredient.id, patch)}
                onRemove={() => remove(ingredient.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                registerNameRef={(el) => registerRef(ingredient.id, el)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={add}
        className="mt-2 text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-amber-500"
      >
        + Add ingredient
      </button>
    </div>
  );
}

function SortableIngredientRow({
  ingredient,
  onChange,
  onRemove,
  onKeyDown,
  registerNameRef,
}: {
  ingredient: Ingredient;
  onChange: (patch: Partial<Ingredient>) => void;
  onRemove: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
  registerNameRef: (el: HTMLElement | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ingredient.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-lg bg-stone-50 dark:bg-stone-950">
      <DragHandle {...attributes} {...listeners} />
      <input
        aria-label="Quantity"
        placeholder="Qty"
        value={ingredient.quantity ?? ""}
        onChange={(event) => onChange({ quantity: event.target.value })}
        onKeyDown={onKeyDown}
        className={`${fieldClass} w-14 shrink-0`}
      />
      <input
        aria-label="Unit"
        placeholder="Unit"
        value={ingredient.unit ?? ""}
        onChange={(event) => onChange({ unit: event.target.value })}
        onKeyDown={onKeyDown}
        className={`${fieldClass} w-16 shrink-0`}
      />
      <input
        ref={(el) => registerNameRef(el)}
        aria-label="Ingredient name"
        placeholder="Ingredient"
        value={ingredient.name}
        onChange={(event) => onChange({ name: event.target.value })}
        onKeyDown={onKeyDown}
        className={`${fieldClass} flex-1`}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove ingredient"
        className="shrink-0 rounded-lg p-1.5 text-stone-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
      >
        ✕
      </button>
    </div>
  );
}
