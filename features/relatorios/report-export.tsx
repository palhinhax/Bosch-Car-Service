"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportExport({
  filename,
  header,
  rows,
}: {
  filename: string;
  header: string[];
  rows: (string | number)[][];
}) {
  const download = () => {
    const esc = (c: string | number) => `"${String(c).replace(/"/g, '""')}"`;
    const csv =
      "﻿" +
      [
        header.map(esc).join(";"),
        ...rows.map((r) => r.map(esc).join(";")),
      ].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={download}>
        <Download className="mr-1.5 h-4 w-4" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="mr-1.5 h-4 w-4" /> Imprimir
      </Button>
    </div>
  );
}
