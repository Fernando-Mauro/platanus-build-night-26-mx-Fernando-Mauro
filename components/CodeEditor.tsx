"use client";

// Editable code editor with syntax highlighting. A transparent <textarea> sits
// on top of a highlighted <pre>; both share identical font metrics + padding and
// their scroll is synced, so what you type lines up exactly with the colors.
import { useRef, type KeyboardEvent } from "react";
import { tokenizeLine } from "@/lib/data";

export function CodeEditor({
  value,
  onChange,
  lang,
}: {
  value: string;
  onChange: (v: string) => void;
  lang: string;
}) {
  const preRef = useRef<HTMLPreElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const syncScroll = () => {
    if (preRef.current && taRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab inserts two spaces instead of moving focus.
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = value.slice(0, start) + "  " + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  // Render an extra blank line so the last line stays visible while typing.
  const lines = value.split("\n");

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b0b0d] font-mono text-[13px] leading-relaxed">
      <pre
        ref={preRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 m-0 overflow-auto whitespace-pre p-4 text-zinc-200"
      >
        {lines.map((line, i) => (
          <span key={i}>
            {tokenizeLine(line, lang).map((t, j) => (
              <span key={j} className={t.cls ?? undefined}>{t.txt}</span>
            ))}
            {"\n"}
          </span>
        ))}
      </pre>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={onKeyDown}
        spellCheck={false}
        wrap="off"
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="Escribe tu solución aquí…"
        className="absolute inset-0 m-0 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent p-4 text-transparent caret-zinc-100 outline-none placeholder:text-zinc-600"
      />
    </div>
  );
}
