"use client";

import { useEffect } from "react";

function labelOf(cell: Element): string {
  return (cell.textContent || "").replace(/\s+/g, " ").trim();
}

/** Copy each column title onto its body cells so narrow screens can show label/value cards. */
export function labelDataTables(root: ParentNode = document): void {
  root.querySelectorAll("table").forEach((table) => {
    const headRow = table.querySelector("thead tr");
    if (!headRow) return;
    const labels = Array.from(headRow.children).map(labelOf);
    table.querySelectorAll("tbody tr").forEach((row) => {
      Array.from(row.children).forEach((cell, index) => {
        if (!(cell instanceof HTMLElement)) return;
        const label = labels[index] ?? "";
        if (cell.dataset.label !== label) cell.dataset.label = label;
      });
    });
  });
}

export default function ResponsiveTables() {
  useEffect(() => {
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => labelDataTables());
    };
    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", run);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", run);
    };
  }, []);
  return null;
}
