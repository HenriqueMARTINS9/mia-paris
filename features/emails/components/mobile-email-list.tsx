"use client";

import { MobileEmailCard } from "@/features/emails/components/mobile-email-card";
import type { EmailListItem } from "@/features/emails/types";

interface MobileEmailListProps {
  emails: EmailListItem[];
  onSelectEmail: (emailId: string) => void;
  selectedEmailId: string | null;
}

export function MobileEmailList({
  emails,
  onSelectEmail,
  selectedEmailId,
}: Readonly<MobileEmailListProps>) {
  if (emails.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-white/40 px-6 py-12 text-center">
        <p className="text-base font-semibold">Aucun email trouvé</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajuste les filtres ou attends les prochains emails entrants.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2.5">
      {emails.map((email) => (
        <MobileEmailCard
          key={email.id}
          email={email}
          isSelected={email.id === selectedEmailId}
          onOpen={() => onSelectEmail(email.id)}
        />
      ))}
    </div>
  );
}
