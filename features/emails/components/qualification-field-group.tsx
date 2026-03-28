import type { ReactNode } from "react";

export function QualificationFieldGroup({
  children,
  description,
  label,
}: Readonly<{
  children: ReactNode;
  description?: string | null;
  label: string;
}>) {
  return (
    <div className="grid gap-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
