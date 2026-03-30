"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function MobileReplyEditor({
  body,
  onBodyChange,
  onSubjectChange,
  subject,
}: Readonly<{
  body: string;
  onBodyChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  subject: string;
}>) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Objet
        </p>
        <Input
          value={subject}
          onChange={(event) => onSubjectChange(event.target.value)}
          placeholder="Objet du brouillon"
        />
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Corps du message
        </p>
        <Textarea
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          placeholder="Le brouillon apparaîtra ici."
          className="min-h-[320px]"
        />
      </div>
    </div>
  );
}
