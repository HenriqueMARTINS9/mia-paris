"use client";

import { Clock3, FolderPlus, Link2, Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

interface MobileEmailActionBarProps {
  canAttach: boolean;
  canCreate: boolean;
  isAttachPending: boolean;
  isCreatePending: boolean;
  isIgnorePending: boolean;
  isReviewPending: boolean;
  onAttach: () => void;
  onCreate: () => void;
  onIgnore: () => void;
  onReview: () => void;
}

export function MobileEmailActionBar({
  canAttach,
  canCreate,
  isAttachPending,
  isCreatePending,
  isIgnorePending,
  isReviewPending,
  onAttach,
  onCreate,
  onIgnore,
  onReview,
}: Readonly<MobileEmailActionBarProps>) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-black/[0.06] bg-[#fbf8f1]/95 px-4 pb-4 pt-3 backdrop-blur">
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onCreate} disabled={!canCreate || isCreatePending}>
          {isCreatePending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Création
            </>
          ) : (
            <>
              <FolderPlus className="h-4 w-4" />
              Créer
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onAttach}
          disabled={!canAttach || isAttachPending}
        >
          {isAttachPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Liaison
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              Rattacher
            </>
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={onReview}
          disabled={isReviewPending}
        >
          {isReviewPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              En cours
            </>
          ) : (
            <>
              <TriangleAlert className="h-4 w-4" />
              À revoir
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={onIgnore}
          disabled={isIgnorePending}
          className="border border-black/[0.06] bg-white/70"
        >
          {isIgnorePending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              En cours
            </>
          ) : (
            <>
              <Clock3 className="h-4 w-4" />
              Ignorer
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
