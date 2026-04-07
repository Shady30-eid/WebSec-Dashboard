import { ExportResult } from "@workspace/api-client-react";

export function downloadFile(exportResult: ExportResult) {
  const blob = new Blob([exportResult.content], {
    type: exportResult.format === "json" ? "application/json" : "text/html",
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = exportResult.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}