import { Select } from "@/components/ui/select";
import type { DocumentType } from "@/features/documents/types";

const documentTypeOptions: Array<{ label: string; value: DocumentType }> = [
  { label: "Tech pack", value: "tech_pack" },
  { label: "Photos proto", value: "proto_photo" },
  { label: "Price sheet", value: "price_sheet" },
  { label: "Rapport labo", value: "lab_test" },
  { label: "Rapport inspection", value: "inspection_report" },
  { label: "Packing list", value: "packing_list" },
  { label: "Facture", value: "invoice" },
  { label: "Artwork étiquette", value: "label_artwork" },
  { label: "Étiquette composition", value: "composition_label" },
  { label: "Autre", value: "other" },
] as const;

export function DocumentTypeSelect({
  onChange,
  value,
}: Readonly<{
  onChange: (value: DocumentType) => void;
  value: DocumentType;
}>) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value as DocumentType)}>
      {documentTypeOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
