import { Select } from "@/components/ui/select";
import { requestPriorityMeta } from "@/features/requests/metadata";
import type { RequestPriority } from "@/features/requests/types";

interface PrioritySelectProps {
  onChange: (value: RequestPriority) => void;
  value: RequestPriority;
}

export function PrioritySelect({
  onChange,
  value,
}: Readonly<PrioritySelectProps>) {
  return (
    <Select
      value={value}
      onChange={(event) => onChange(event.target.value as RequestPriority)}
    >
      {(["critical", "high", "normal"] as const).map((priority) => (
        <option key={priority} value={priority}>
          {requestPriorityMeta[priority].label}
        </option>
      ))}
    </Select>
  );
}
