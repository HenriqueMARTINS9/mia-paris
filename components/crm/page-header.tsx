import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
}: Readonly<PageHeaderProps>) {
  return (
    <section className="glass-panel rounded-[1.75rem] border border-white/70 px-5 py-5 sm:px-6 lg:px-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl xl:text-[2.1rem]">
              {title}
            </h1>
            {badge ? <Badge>{badge}</Badge> : null}
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-[15px]">
            {description}
          </p>
        </div>

        {actions ? (
          <div className="flex w-full flex-wrap gap-2 xl:w-auto xl:max-w-[42%] xl:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
