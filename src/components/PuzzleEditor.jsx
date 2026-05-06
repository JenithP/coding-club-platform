"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PyodideRunner from "./PyodideRunner";

/**
 * puzzle: {
 *   puzzleType: "blank" | "dragdrop",
 *   template?: string,             // blank: code with "___" placeholders
 *   blanks?: string[],             // blank: expected fills in order (case-sensitive trim)
 *   snippets?: string[],           // dragdrop: lines (presented shuffled)
 *   correctOrder?: number[],       // dragdrop: indices into `snippets` in correct order
 *   expectedOutput?: string,       // optional stdout to compare (after running assembled code)
 *   testSuffix?: string,           // optional code appended before run (assertions etc.)
 *   maxScore?: number
 * }
 */
export default function PuzzleEditor({ puzzle, onSubmit }) {
  if (puzzle.puzzleType === "dragdrop") return <DragDropPuzzle puzzle={puzzle} onSubmit={onSubmit} />;
  return <BlankPuzzle puzzle={puzzle} onSubmit={onSubmit} />;
}

// ============================================================
// Fill-in-the-blank
// ============================================================
function BlankPuzzle({ puzzle, onSubmit }) {
  const segments = useMemo(() => (puzzle.template ?? "").split("___"), [puzzle.template]);
  const blankCount = Math.max(0, segments.length - 1);
  const [values, setValues] = useState(() => Array(blankCount).fill(""));

  const assembled = useMemo(() => {
    let out = "";
    segments.forEach((seg, i) => {
      out += seg;
      if (i < segments.length - 1) out += values[i] ?? "";
    });
    return out;
  }, [segments, values]);

  const handleResult = ({ stdout, error }) => {
    const expected = (puzzle.blanks ?? []).map((b) => b.trim());
    const exact =
      expected.length > 0 &&
      expected.every((exp, i) => (values[i] ?? "").trim() === exp);

    let runOk = !error;
    if (puzzle.expectedOutput != null) {
      runOk = runOk && stdout?.trim() === String(puzzle.expectedOutput).trim();
    }

    const max = puzzle.maxScore ?? 100;
    let score = 0;
    if (exact && runOk) score = max;
    else if (exact || runOk) score = Math.round(max * 0.7);
    else if (!error) score = Math.round(max * 0.3);

    onSubmit?.({ score, stdout, error, code: assembled, blanks: values });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        빈칸(<span className="font-mono">___</span>)을 채워 코드를 완성하세요.
      </p>
      <div className="rounded-lg bg-slate-900 p-4 font-mono text-sm text-slate-100 overflow-x-auto">
        {segments.map((seg, i) => (
          <span key={i} className="whitespace-pre">
            {seg}
            {i < segments.length - 1 && (
              <input
                aria-label={`빈칸 ${i + 1}`}
                value={values[i] ?? ""}
                onChange={(e) => {
                  const next = [...values];
                  next[i] = e.target.value;
                  setValues(next);
                }}
                className="mx-1 inline-block min-w-[60px] rounded bg-amber-200/95 px-1.5 py-0.5 text-slate-900 outline-none ring-1 ring-amber-400 focus:ring-2"
                style={{ width: `${Math.max(4, (values[i]?.length ?? 0) + 1)}ch` }}
              />
            )}
          </span>
        ))}
      </div>

      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer">조립된 코드 미리보기</summary>
        <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 font-mono text-[11px] text-gray-700">
          {assembled + (puzzle.testSuffix ? "\n" + puzzle.testSuffix : "")}
        </pre>
      </details>

      <PyodideRunner
        code={assembled + (puzzle.testSuffix ? "\n" + puzzle.testSuffix : "")}
        onResult={handleResult}
        buttonLabel="실행하고 채점하기"
      />
    </div>
  );
}

// ============================================================
// Drag-and-drop
// ============================================================
function shuffleStable(arr) {
  return arr
    .map((v, i) => [v, ((i * 9301 + 49297) % 233280) / 233280])
    .sort((a, b) => a[1] - b[1])
    .map((x) => x[0]);
}

function DragDropPuzzle({ puzzle, onSubmit }) {
  const initialIds = useMemo(() => {
    const ids = (puzzle.snippets ?? []).map((_, i) => i);
    return shuffleStable(ids);
  }, [puzzle.snippets]);
  const [order, setOrder] = useState(initialIds);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id);
    const newIndex = order.indexOf(over.id);
    setOrder(arrayMove(order, oldIndex, newIndex));
  };

  const assembled = useMemo(
    () => order.map((id) => (puzzle.snippets ?? [])[id]).join("\n"),
    [order, puzzle.snippets]
  );

  const handleResult = ({ stdout, error }) => {
    const correct = puzzle.correctOrder ?? [];
    const orderOk =
      correct.length === order.length && correct.every((v, i) => v === order[i]);

    let runOk = !error;
    if (puzzle.expectedOutput != null) {
      runOk = runOk && stdout?.trim() === String(puzzle.expectedOutput).trim();
    }

    const max = puzzle.maxScore ?? 100;
    let score = 0;
    if (orderOk && runOk) score = max;
    else if (orderOk || runOk) score = Math.round(max * 0.7);
    else if (!error) score = Math.round(max * 0.3);

    onSubmit?.({ score, stdout, error, code: assembled, order });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        조각을 위아래로 드래그하여 올바른 순서로 배치하세요.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2 rounded-lg bg-slate-900 p-3 font-mono text-sm text-slate-100">
            {order.map((id, idx) => (
              <SortableSnippet key={id} id={id} index={idx} text={(puzzle.snippets ?? [])[id]} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer">조립된 코드 미리보기</summary>
        <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 font-mono text-[11px] text-gray-700">
          {assembled + (puzzle.testSuffix ? "\n" + puzzle.testSuffix : "")}
        </pre>
      </details>

      <PyodideRunner
        code={assembled + (puzzle.testSuffix ? "\n" + puzzle.testSuffix : "")}
        onResult={handleResult}
        buttonLabel="실행하고 채점하기"
      />
    </div>
  );
}

function SortableSnippet({ id, index, text }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex cursor-grab items-start gap-3 rounded-md bg-slate-800 px-3 py-2 ring-1 ring-slate-700 hover:bg-slate-700 active:cursor-grabbing"
    >
      <span className="select-none text-xs text-slate-400">{index + 1}</span>
      <pre className="whitespace-pre-wrap break-all text-slate-100">{text}</pre>
    </li>
  );
}
