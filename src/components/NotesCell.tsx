"use client";

import { useState } from "react";

const LIMIT = 80;

export default function NotesCell({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return <span className="text-stone-400">—</span>;

  const isLong = text.length > LIMIT;
  if (!isLong) return <span className="text-stone-600">{text}</span>;

  const shown = expanded ? text : text.slice(0, LIMIT).trimEnd() + "…";

  return (
    <span className="text-stone-600">
      {shown}{" "}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="whitespace-nowrap font-medium text-stone-800 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-500"
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </span>
  );
}
