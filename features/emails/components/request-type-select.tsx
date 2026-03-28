import { Select } from "@/components/ui/select";
import {
  emailRequestTypeMeta,
  emailRequestTypeOptions,
} from "@/features/emails/metadata";
import type { EmailQualificationDraft } from "@/features/emails/types";

interface RequestTypeSelectProps {
  onChange: (value: EmailQualificationDraft["requestType"]) => void;
  value: EmailQualificationDraft["requestType"];
}

export function RequestTypeSelect({
  onChange,
  value,
}: Readonly<RequestTypeSelectProps>) {
  return (
    <Select value={value ?? ""} onChange={(event) => onChange(event.target.value || null)}>
      <option value="">Sélectionner un type</option>
      {emailRequestTypeOptions.map((requestType) => (
        <option key={requestType} value={requestType}>
          {emailRequestTypeMeta[requestType].label}
        </option>
      ))}
    </Select>
  );
}
