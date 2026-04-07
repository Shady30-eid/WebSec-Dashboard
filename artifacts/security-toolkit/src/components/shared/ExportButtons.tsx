import { useState } from "react";
import { Download, FileJson, FileCode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExportReport } from "@workspace/api-client-react";
import { downloadFile } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonsProps {
  data: any;
  title: string;
}

export function ExportButtons({ data, title }: ExportButtonsProps) {
  const [isExportingHtml, setIsExportingHtml] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);
  const exportMutation = useExportReport();
  const { toast } = useToast();

  const handleExport = async (format: "html" | "json") => {
    if (format === "html") setIsExportingHtml(true);
    else setIsExportingJson(true);

    try {
      const result = await exportMutation.mutateAsync({
        data: { format, data: data as Record<string, unknown>, title }
      });
      downloadFile(result);
      toast({
        title: "Export complete",
        description: `Successfully exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to generate export file.",
        variant: "destructive",
      });
    } finally {
      setIsExportingHtml(false);
      setIsExportingJson(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("html")} disabled={isExportingHtml || isExportingJson}>
          {isExportingHtml ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCode className="mr-2 h-4 w-4" />}
          Export HTML
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")} disabled={isExportingHtml || isExportingJson}>
          {isExportingJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileJson className="mr-2 h-4 w-4" />}
          Export JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}