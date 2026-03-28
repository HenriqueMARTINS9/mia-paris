"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { RequestLinkOption } from "@/features/requests/types";

interface ExistingRequestMatcherProps {
  disabled?: boolean;
  error?: string | null;
  onSelectValue: (value: string) => void;
  requestOptions: RequestLinkOption[];
  selectedValue: string;
}

export function ExistingRequestMatcher({
  disabled = false,
  error = null,
  onSelectValue,
  requestOptions,
  selectedValue,
}: Readonly<ExistingRequestMatcherProps>) {
  const [search, setSearch] = useState("");
  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (query.length === 0) {
      return requestOptions;
    }

    return requestOptions.filter((option) =>
      option.label.toLowerCase().includes(query),
    );
  }, [requestOptions, search]);

  return (
    <div className="grid gap-3">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Rechercher une demande existante"
        disabled={disabled || requestOptions.length === 0}
      />
      <Select
        value={selectedValue}
        onChange={(event) => onSelectValue(event.target.value)}
        disabled={disabled || requestOptions.length === 0}
      >
        <option value="">
          {filteredOptions.length > 0
            ? "Sélectionner une demande"
            : "Aucune demande disponible"}
        </option>
        {filteredOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </Select>
      {error ? (
        <p className="text-xs leading-5 text-muted-foreground">{error}</p>
      ) : null}
    </div>
  );
}
