import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface URLInputBarProps {
  onScan: (url: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  buttonText?: string;
}

export function URLInputBar({
  onScan,
  isLoading = false,
  placeholder = "https://example.com",
  buttonText = "Scan",
}: URLInputBarProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    // Add https:// if missing
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }
    
    onScan(targetUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-3xl items-center space-x-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="pl-10 h-12 bg-background/50 border-input font-mono text-sm focus-visible:ring-primary"
          disabled={isLoading}
        />
      </div>
      <Button 
        type="submit" 
        disabled={isLoading || !url.trim()} 
        className="h-12 px-6 font-semibold"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Scanning...
          </>
        ) : (
          buttonText
        )}
      </Button>
    </form>
  );
}