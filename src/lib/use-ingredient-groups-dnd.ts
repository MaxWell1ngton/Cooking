"use client";

import { useCallback } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Ingredient } from "@/types/recipe";
import type { IngredientsValue } from "@/lib/ingredient-groups";

export const UNGROUPED_CONTAINER_ID = "ungrouped";

export function containerIdForGroup(groupId: string): string {
  return `group:${groupId}`;
}

/**
 * Two independent drag "domains" share one DndContext (ingredient rows need
 * a single context spanning every group so they can cross between them —
 * see below — which rules out giving group-reordering its own nested
 * context). This tag is how everything tells them apart: dragging a whole
 * group card only ever interacts with other group cards, never with
 * ingredient rows or containers, and vice versa.
 */
export type DragTargetData =
  | { type: "ingredient"; containerId: string }
  | { type: "container"; containerId: string }
  | { type: "group" };

function targetType(data: unknown): DragTargetData["type"] | undefined {
  return (data as DragTargetData | undefined)?.type;
}

/**
 * closestCorners alone would happily let a dragged group card "collide"
 * with an ingredient row inside a neighboring group (rows are small and
 * often geometrically closer than the group's own bounds), and vice versa.
 * Filtering candidates to the active item's own domain first prevents that
 * cross-talk entirely, so the two drag behaviors can't interfere.
 */
const collisionDetection: CollisionDetection = (args) => {
  const activeType = targetType(args.active.data.current);
  const relevant = args.droppableContainers.filter((container) => {
    const containerType = targetType(container.data.current);
    return activeType === "group" ? containerType === "group" : containerType !== "group";
  });
  return closestCorners({ ...args, droppableContainers: relevant });
};

function toContainers(value: IngredientsValue): Map<string, Ingredient[]> {
  const map = new Map<string, Ingredient[]>();
  map.set(UNGROUPED_CONTAINER_ID, value.ungrouped);
  for (const group of value.groups) {
    map.set(containerIdForGroup(group.id), group.ingredients);
  }
  return map;
}

function fromContainers(value: IngredientsValue, containers: Map<string, Ingredient[]>): IngredientsValue {
  return {
    ungrouped: containers.get(UNGROUPED_CONTAINER_ID) ?? value.ungrouped,
    groups: value.groups.map((group) => ({
      ...group,
      ingredients: containers.get(containerIdForGroup(group.id)) ?? group.ingredients,
    })),
  };
}

function findContainerId(containers: Map<string, Ingredient[]>, ingredientId: string): string | undefined {
  for (const [containerId, rows] of containers) {
    if (rows.some((row) => row.id === ingredientId)) return containerId;
  }
  return undefined;
}

/**
 * Drag-and-drop for the whole ingredients section: reordering ingredients
 * within a list, moving them between the ungrouped list and any group (or
 * between two groups), and reordering the groups themselves as whole units.
 * The ungrouped list is not reorderable — it's always first (see
 * ingredient-groups.ts) — so only value.groups' order ever changes here.
 */
export function useIngredientGroupsDnd(value: IngredientsValue, onChange: (value: IngredientsValue) => void) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Fires continuously while dragging an ingredient. When the pointer
  // crosses into a different container, move the item there immediately so
  // the list visually reflects where it will land. Group cards reorder
  // within a single flat list, so they get dnd-kit's default sortable
  // shift animation for free and don't need this live-preview step.
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || targetType(active.data.current) !== "ingredient") return;

      const overData = over.data.current as DragTargetData | undefined;
      const overContainerId = overData && "containerId" in overData ? overData.containerId : undefined;
      if (!overContainerId) return;

      const containers = toContainers(value);
      const activeContainerId = findContainerId(containers, String(active.id));
      if (!activeContainerId || activeContainerId === overContainerId) return;

      const activeRows = containers.get(activeContainerId) ?? [];
      const overRows = containers.get(overContainerId) ?? [];
      const moved = activeRows.find((row) => row.id === active.id);
      if (!moved) return;

      const overIndex = overData?.type === "ingredient" ? overRows.findIndex((row) => row.id === over.id) : -1;
      const insertAt = overIndex === -1 ? overRows.length : overIndex;

      containers.set(
        activeContainerId,
        activeRows.filter((row) => row.id !== active.id),
      );
      containers.set(overContainerId, [...overRows.slice(0, insertAt), moved, ...overRows.slice(insertAt)]);

      onChange(fromContainers(value, containers));
    },
    [value, onChange],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      if (targetType(active.data.current) === "group") {
        const oldIndex = value.groups.findIndex((group) => group.id === active.id);
        const newIndex = value.groups.findIndex((group) => group.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        onChange({ ...value, groups: arrayMove(value.groups, oldIndex, newIndex) });
        return;
      }

      // Ingredient: only needs to handle the final reorder *within* a
      // container here — a cross-container move already happened live in
      // onDragOver above.
      const overData = over.data.current as DragTargetData | undefined;
      if (overData?.type !== "ingredient") return;

      const containers = toContainers(value);
      const containerId = findContainerId(containers, String(active.id));
      if (!containerId || containerId !== overData.containerId) return;

      const rows = containers.get(containerId) ?? [];
      const oldIndex = rows.findIndex((row) => row.id === active.id);
      const newIndex = rows.findIndex((row) => row.id === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      containers.set(containerId, arrayMove(rows, oldIndex, newIndex));
      onChange(fromContainers(value, containers));
    },
    [value, onChange],
  );

  return { sensors, collisionDetection, handleDragOver, handleDragEnd };
}
