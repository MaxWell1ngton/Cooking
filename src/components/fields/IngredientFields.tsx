"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { DndContext, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEditableRows } from "@/lib/use-editable-rows";
import { createBlankIngredient, type IngredientGroupDraft, type IngredientsValue } from "@/lib/ingredient-groups";
import {
  containerIdForGroup,
  useIngredientGroupsDnd,
  UNGROUPED_CONTAINER_ID,
  type DragTargetData,
} from "@/lib/use-ingredient-groups-dnd";
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
  // Stable across SSR/CSR so dnd-kit's internal a11y ids don't mismatch on hydration.
  const dndId = useId();
  const { sensors, collisionDetection, handleDragOver, handleDragEnd } = useIngredientGroupsDnd(value, onChange);

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

      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <DroppableArea containerId={UNGROUPED_CONTAINER_ID}>
          <IngredientRowList
            containerId={UNGROUPED_CONTAINER_ID}
            rows={ungrouped}
            onChange={(rows) => onChange({ ungrouped: rows, groups })}
          />
        </DroppableArea>

        {/* Groups are reorderable as whole units; the ungrouped list above
            is not part of this list and always stays first (see
            ingredient-groups.ts) — simplest option, and a natural one: it
            reads as "the basics," with named groups for specific parts. */}
        <SortableContext items={groups.map((group) => group.id)} strategy={verticalListSortingStrategy}>
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              registerNameRef={(el) => {
                if (el) groupNameRefs.current.set(group.id, el);
                else groupNameRefs.current.delete(group.id);
              }}
              onRename={(name) => renameGroup(group.id, name)}
              onRenameKeyDown={handleGroupNameKeyDown}
              onRemove={() => removeGroup(group.id)}
              onChangeIngredients={(rows) =>
                onChange({ ungrouped, groups: groups.map((g) => (g.id === group.id ? { ...g, ingredients: rows } : g)) })
              }
            />
          ))}
        </SortableContext>
      </DndContext>

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

/** Makes the ungrouped list a valid drop target for ingredients, same as each group card below. */
function DroppableArea({ containerId, className, children }: { containerId: string; className?: string; children: ReactNode }) {
  const data: DragTargetData = { type: "container", containerId };
  const { setNodeRef, isOver } = useDroppable({ id: containerId, data });

  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ""} ${isOver ? "outline outline-2 outline-offset-2 outline-amber-400" : ""}`}
    >
      {children}
    </div>
  );
}

/**
 * A group card is two things at once: a drop target for ingredients being
 * moved into it (useDroppable, like the ungrouped list above), and a
 * sortable item itself so the whole card can be dragged to reorder groups
 * (useSortable). Both register on the same DOM node with different ids —
 * "group:<id>" for the ingredient container, "<id>" for the card's own
 * position — so they don't collide, and the group's drag handle (in the
 * header, separate from any ingredient's handle) only ever starts the
 * latter.
 */
function GroupCard({
  group,
  registerNameRef,
  onRename,
  onRenameKeyDown,
  onRemove,
  onChangeIngredients,
}: {
  group: IngredientGroupDraft;
  registerNameRef: (el: HTMLInputElement | null) => void;
  onRename: (name: string) => void;
  onRenameKeyDown: (event: KeyboardEvent) => void;
  onRemove: () => void;
  onChangeIngredients: (rows: Ingredient[]) => void;
}) {
  const containerId = containerIdForGroup(group.id);
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: containerId,
    data: { type: "container", containerId } satisfies DragTargetData,
  });
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id, data: { type: "group" } satisfies DragTargetData });

  const setNodeRef = (node: HTMLDivElement | null) => {
    setDroppableRef(node);
    setSortableRef(node);
  };
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-stone-200 p-3 dark:border-stone-800 ${isOver ? "outline outline-2 outline-offset-2 outline-amber-400" : ""}`}
    >
      <div className="flex items-center gap-2">
        <DragHandle {...attributes} {...listeners} aria-label="Drag to reorder group" />
        <input
          ref={registerNameRef}
          value={group.name}
          onChange={(event) => onRename(event.target.value)}
          onKeyDown={onRenameKeyDown}
          placeholder="Group name, e.g. Dry mix"
          className={`${fieldClass} flex-1 font-medium`}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove group${group.name ? ` "${group.name}"` : ""}`}
          className="shrink-0 rounded-lg p-1.5 text-stone-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        >
          ✕
        </button>
      </div>
      <div className="mt-3">
        <IngredientRowList containerId={containerId} rows={group.ingredients} onChange={onChangeIngredients} />
      </div>
    </div>
  );
}

function IngredientRowList({
  containerId,
  rows,
  onChange,
}: {
  containerId: string;
  rows: Ingredient[];
  onChange: (rows: Ingredient[]) => void;
}) {
  const { registerRef, focusAfterChange, remove } = useEditableRows(rows, onChange);

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
      <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {rows.length === 0 && (
            <p className="rounded-lg border border-dashed border-stone-300 px-3 py-4 text-center text-sm text-stone-400 dark:border-stone-700 dark:text-stone-500">
              Drag ingredients here
            </p>
          )}
          {rows.map((ingredient, index) => (
            <SortableIngredientRow
              key={ingredient.id}
              containerId={containerId}
              ingredient={ingredient}
              onChange={(patch) => update(ingredient.id, patch)}
              onRemove={() => remove(ingredient.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              registerNameRef={(el) => registerRef(ingredient.id, el)}
            />
          ))}
        </div>
      </SortableContext>
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
  containerId,
  ingredient,
  onChange,
  onRemove,
  onKeyDown,
  registerNameRef,
}: {
  containerId: string;
  ingredient: Ingredient;
  onChange: (patch: Partial<Ingredient>) => void;
  onRemove: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
  registerNameRef: (el: HTMLElement | null) => void;
}) {
  const data: DragTargetData = { type: "ingredient", containerId };
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ingredient.id,
    data,
  });
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
