"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { parseStepText } from "@/lib/step-group-links";
import { formatIngredient } from "@/lib/format";
import { scaleQuantityDisplay } from "@/lib/recipe-scaling";
import type { Recipe } from "@/types/recipe";

interface StepTextProps {
  step: string;
  recipe: Recipe;
  scale: number;
}

/** Renders a step's text, turning any [[group:<id>]] markup into an inline group-link chip. */
export function StepText({ step, recipe, scale }: StepTextProps) {
  return (
    <>
      {parseStepText(step).map((segment, index) =>
        segment.type === "text" ? (
          <Fragment key={index}>{segment.text}</Fragment>
        ) : (
          <GroupLinkChip key={index} groupId={segment.groupId} recipe={recipe} scale={scale} />
        ),
      )}
    </>
  );
}

function GroupLinkChip({ groupId, recipe, scale }: { groupId: string; recipe: Recipe; scale: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();

  const ingredientGroup = recipe.ingredientGroups.find((candidate) => candidate.id === groupId);
  const ingredients = ingredientGroup
    ? recipe.ingredients.filter((ingredient) => ingredient.groupId === ingredientGroup.id)
    : [];

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // The group was deleted, or every ingredient that was in it has since
  // moved out — nothing useful to pop over, so degrade to plain text
  // instead of an interactive link that goes nowhere.
  if (!ingredientGroup || ingredients.length === 0) {
    return (
      <span className="text-stone-500 dark:text-stone-400">
        {ingredientGroup ? ingredientGroup.name : "(ingredient group removed)"}
      </span>
    );
  }

  return (
    <span ref={containerRef} className="group relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-describedby={popoverId}
        className="font-medium text-amber-700 underline decoration-amber-400 decoration-2 underline-offset-2 hover:text-amber-800 dark:text-amber-500 dark:decoration-amber-700 dark:hover:text-amber-400"
      >
        {ingredientGroup.name}
      </button>
      <span
        id={popoverId}
        role="tooltip"
        className={`absolute left-0 top-full z-10 mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-stone-200 bg-white p-3 text-left align-baseline text-sm normal-case leading-relaxed text-stone-700 shadow-lg dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 ${
          isOpen ? "block" : "hidden group-hover:block"
        }`}
      >
        <p className="mb-1.5 font-serif font-semibold text-stone-900 dark:text-stone-100">{ingredientGroup.name}</p>
        <ul className="space-y-1">
          {ingredients.map((ingredient) => (
            <li key={ingredient.id}>
              {formatIngredient({ ...ingredient, quantity: scaleQuantityDisplay(ingredient.quantity, scale) })}
            </li>
          ))}
        </ul>
      </span>
    </span>
  );
}
