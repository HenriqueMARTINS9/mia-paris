import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
}: Readonly<EmptyStateProps>) {
  return (
    <Card>
      <CardContent className="flex min-h-[18rem] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/[0.08] text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div className="max-w-lg">
          <p className="text-lg font-semibold">{title}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
