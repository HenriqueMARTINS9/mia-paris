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
    <section className="rounded-[1.35rem] border border-black/[0.06] bg-white/82 px-4 py-4 shadow-[0_18px_44px_rgba(18,27,34,0.05)] backdrop-blur-xl sm:px-6 sm:py-5 lg:px-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? (
            <Badge
              variant="outline"
              className="mb-3 border-black/[0.06] bg-[#fbf8f2] text-[11px] text-muted-foreground"
            >
              {eyebrow}
            </Badge>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[1.65rem] font-semibold tracking-tight text-foreground sm:text-3xl xl:text-[2.15rem]">
              {title}
            </h1>
            {badge ? (
              <Badge className="border-primary/10 bg-primary/[0.08] text-primary">
                {badge}
              </Badge>
            ) : null}
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
            {description}
          </p>
        </div>

        {actions ? (
          <div className="grid w-full gap-2 sm:flex sm:flex-wrap lg:w-auto lg:max-w-[45%] lg:justify-end [&>*]:w-full sm:[&>*]:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
