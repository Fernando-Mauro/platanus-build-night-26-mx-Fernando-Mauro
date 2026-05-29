"use client";

import { tokenizeLine } from "@/lib/data";

export function HighlightedCode({ code, lang }: { code: string; lang: string }) {
  const lines = code.split("\n");
  return (
    <div className="flex font-mono text-[13px] leading-[22px]">
      <div className="select-none pl-5 pr-4 text-right text-zinc-700 tabular-nums">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <pre className="flex-1 overflow-x-auto pr-6">
        <code>
          {lines.map((line, li) => (
            <div key={li} className="min-h-[22px]">
              {tokenizeLine(line, lang).map((t, ti) =>
                t.cls ? (
                  <span key={ti} className={t.cls}>
                    {t.txt}
                  </span>
                ) : (
                  <span key={ti}>{t.txt}</span>
                )
              )}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
