import { Select } from "@/components/ui/select";
import type {
  DocumentFormOptions,
  RelatedEntitySelection,
} from "@/features/documents/types";

interface RelatedEntityPickerProps {
  disabled?: boolean;
  onChange: (value: RelatedEntitySelection) => void;
  options: DocumentFormOptions;
  value: RelatedEntitySelection;
}

export function RelatedEntityPicker({
  disabled = false,
  onChange,
  options,
  value,
}: Readonly<RelatedEntityPickerProps>) {
  function patchValue(nextValue: Partial<RelatedEntitySelection>) {
    onChange({
      ...value,
      ...nextValue,
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <EntitySelect
        label="Demande"
        disabled={disabled}
        options={options.requests}
        value={value.requestId}
        onChange={(requestId) => patchValue({ requestId })}
        placeholder="Sans demande liée"
      />

      <EntitySelect
        label="Modèle"
        disabled={disabled}
        options={options.models}
        value={value.modelId}
        onChange={(modelId) => patchValue({ modelId })}
        placeholder="Sans modèle lié"
      />

      <EntitySelect
        label="Commande"
        disabled={disabled}
        options={options.orders}
        value={value.orderId}
        onChange={(orderId) => {
          const selectedOrder = options.orders.find((option) => option.id === orderId);

          patchValue({
            modelId: selectedOrder?.modelId ?? value.modelId,
            orderId,
            requestId: selectedOrder?.requestId ?? value.requestId,
          });
        }}
        placeholder="Sans commande liée"
      />

      <EntitySelect
        label="Production"
        disabled={disabled}
        options={options.productions}
        value={value.productionId}
        onChange={(productionId) => {
          const selectedProduction = options.productions.find(
            (option) => option.id === productionId,
          );

          patchValue({
            modelId: selectedProduction?.modelId ?? value.modelId,
            orderId: selectedProduction?.orderId ?? value.orderId,
            productionId,
            requestId: selectedProduction?.requestId ?? value.requestId,
          });
        }}
        placeholder="Sans production liée"
      />
    </div>
  );
}

function EntitySelect({
  disabled,
  label,
  onChange,
  options,
  placeholder,
  value,
}: Readonly<{
  disabled: boolean;
  label: string;
  onChange: (value: string | null) => void;
  options: Array<{ id: string; label: string; secondary: string | null }>;
  placeholder: string;
  value: string | null;
}>) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <Select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.secondary ? `${option.label} · ${option.secondary}` : option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
