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
    <section className="rounded-[1.1rem] border border-black/[0.06] bg-white/82 px-4 py-4 shadow-[0_16px_38px_rgba(18,27,34,0.045)] backdrop-blur-xl sm:rounded-[1.25rem] sm:px-5 sm:py-[1.125rem] lg:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? (
            <Badge
              variant="outline"
              className="mb-2 border-black/[0.06] bg-[#fbf8f2] text-[10px] text-muted-foreground"
            >
              {eyebrow}
            </Badge>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[1.45rem] font-semibold tracking-tight text-foreground sm:text-[1.9rem] xl:text-[2.05rem]">
              {title}
            </h1>
            {badge ? (
              <Badge className="border-primary/10 bg-primary/[0.08] text-primary">
                {badge}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2.5 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-[1.65rem]">
            {description}
          </p>
        </div>

        {actions ? (
          <div className="grid w-full gap-2 sm:flex sm:flex-wrap lg:w-auto lg:max-w-[45%] lg:justify-end [&>*]:w-full [&>*]:justify-center sm:[&>*]:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
