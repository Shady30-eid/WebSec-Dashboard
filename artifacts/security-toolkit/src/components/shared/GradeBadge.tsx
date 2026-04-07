import { Badge } from "@/components/ui/badge";

interface GradeBadgeProps {
  grade: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function GradeBadge({ grade, size = "md", className = "" }: GradeBadgeProps) {
  const getGradeColor = (g: string) => {
    const normalized = g.toUpperCase().replace(/[^A-F+-]/g, "");
    if (normalized.startsWith("A+")) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
    if (normalized.startsWith("A")) return "bg-green-500/20 text-green-400 border-green-500/50";
    if (normalized.startsWith("B")) return "bg-lime-500/20 text-lime-400 border-lime-500/50";
    if (normalized.startsWith("C")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    if (normalized.startsWith("D")) return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    return "bg-red-500/20 text-red-400 border-red-500/50"; // F
  };

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs font-semibold",
    md: "px-2.5 py-1 text-sm font-bold",
    lg: "px-3 py-1.5 text-lg font-bold",
    xl: "px-5 py-2 text-3xl font-black",
  };

  return (
    <Badge 
      variant="outline" 
      className={`${getGradeColor(grade)} ${sizeClasses[size]} rounded-md border ${className}`}
    >
      {grade}
    </Badge>
  );
}