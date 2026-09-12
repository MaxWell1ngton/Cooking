"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import {
  buildDisplaySegments,
  toDisplayValue,
  reconcileEdit,
  insertGroupChip,
  type GroupOption,
} from "@/lib/mention-editor";

interface MentionStepFieldProps {
  value: string;
  placeholder?: string;
  groups: GroupOption[];
  onChangeValue: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  registerRef: (el: HTMLTextAreaElement | null) => void;
}

const fieldClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

/**
 * A step textarea where typing "@" opens a simple dropdown of the recipe's
 * ingredient groups — no free-text matching. Picking one inserts a clean
 * "@GroupName" run in place of the "@", while the actual persisted text
 * still carries the real [[group:id]] token underneath (looked up fresh
 * each render, via buildDisplaySegments, so a rename shows up immediately
 * and the reference survives it). Editing into or across an inserted
 * mention just turns it back into plain text — a plain <textarea> can't
 * protect part of it, so that's the accepted, simple trade-off.
 */
export function MentionStepField({ value, placeholder, groups, onChangeValue, onKeyDown, registerRef }: MentionStepFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingCursorRef = useRef<number | null>(null);
  // Display-position right after the "@" that opened the dropdown, or null when it's closed.
  const [dropdownAnchor, setDropdownAnchor] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const displayValue = toDisplayValue(buildDisplaySegments(value, groups));

  // Auto-grow to fit content instead of a fixed height with internal
  // scrolling. The element is border-box, but scrollHeight only measures
  // content + padding — add the border back in, or the height set here
  // ends up a couple pixels short and the textarea scrolls anyway.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { borderTopWidth, borderBottomWidth } = getComputedStyle(textarea);
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight + parseFloat(borderTopWidth) + parseFloat(borderBottomWidth)}px`;
  });

  // Runs after a value we just spliced a chip into actually reaches the
  // DOM, so the cursor lands right after it rather than wherever the
  // browser happens to put it after a controlled-value change.
  useEffect(() => {
    if (pendingCursorRef.current === null) return;
    const pos = pendingCursorRef.current;
    pendingCursorRef.current = null;
    const textarea = textareaRef.current;
    textarea?.focus();
    textarea?.setSelectionRange(pos, pos);
  }, [value]);

  const closeDropdown = () => {
    setDropdownAnchor(null);
    setHighlightedIndex(0);
  };

  const selectGroup = (group: GroupOption) => {
    if (dropdownAnchor === null) return;
    const result = insertGroupChip(value, groups, dropdownAnchor, group.id);
    pendingCursorRef.current = result.cursor;
    onChangeValue(result.value);
    closeDropdown();
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const newDisplayValue = event.target.value;
    const cursor = event.target.selectionStart ?? newDisplayValue.length;
    onChangeValue(reconcileEdit(value, groups, displayValue, newDisplayValue));

    // Re-derived fresh on every keystroke (typing OR deleting) rather than
    // only right when "@" is typed, so backspacing back to a bare "@" (e.g.
    // undoing what you typed after it) reopens the dropdown too.
    const charBeforeCursor = cursor > 0 ? newDisplayValue[cursor - 1] : "";
    if (charBeforeCursor === "@" && groups.length > 0) {
      setDropdownAnchor(cursor);
      setHighlightedIndex(0);
    } else if (dropdownAnchor !== null) {
      closeDropdown();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (dropdownAnchor !== null) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((current) => (current + 1) % groups.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex((current) => (current - 1 + groups.length) % groups.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        selectGroup(groups[highlightedIndex]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeDropdown();
        return;
      }
    }
    onKeyDown(event);
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={(el) => {
          textareaRef.current = el;
          registerRef(el);
        }}
        value={displayValue}
        onChange={handleChange}
        onBlur={closeDropdown}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={2}
        className={`${fieldClass} min-h-[2.5rem] resize-none overflow-hidden leading-relaxed`}
      />
      {dropdownAnchor !== null && groups.length > 0 && (
        <ul
          role="listbox"
          aria-label="Ingredient group suggestions"
          className="absolute left-0 top-full z-20 mt-1 max-h-48 w-56 overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 text-sm shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
          {groups.map((group, index) => (
            <li key={group.id} role="option" aria-selected={index === highlightedIndex}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectGroup(group)}
                className={`block w-full px-3 py-1.5 text-left ${
                  index === highlightedIndex
                    ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                    : "text-stone-700 dark:text-stone-300"
                }`}
              >
                {group.name.trim() || "(unnamed group)"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
