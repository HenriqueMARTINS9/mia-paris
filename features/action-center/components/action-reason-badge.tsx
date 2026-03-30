import { Badge } from "@/components/ui/badge";

export function ActionReasonBadge({
  label,
}: Readonly<{ label: string }>) {
  return (
    <Badge variant="outline" className="bg-[#fbf8f2]">
      {label}
    </Badge>
  );
}
