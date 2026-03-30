import type {
  ReplyDraftType,
  SavedReplyDraft,
} from "@/features/replies/types";

export function buildReplyDraftStorageKey(
  sourceType: string,
  sourceId: string,
) {
  return `mia-reply-draft:${sourceType}:${sourceId}`;
}

export function readStoredReplyDraft(storageKey: string): SavedReplyDraft {
  if (typeof window === "undefined") {
    return emptySavedDraft();
  }

  try {
    const savedDraft = window.localStorage.getItem(storageKey);

    if (!savedDraft) {
      return emptySavedDraft();
    }

    const parsed = JSON.parse(savedDraft) as {
      body?: string;
      replyType?: ReplyDraftType;
      subject?: string;
      updatedAt?: string | null;
    };

    return {
      body: parsed.body ?? "",
      replyType: parsed.replyType ?? "acknowledgement",
      subject: parsed.subject ?? "",
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }

    return emptySavedDraft();
  }
}

export function writeStoredReplyDraft(
  storageKey: string,
  value: SavedReplyDraft,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

function emptySavedDraft(): SavedReplyDraft {
  return {
    body: "",
    replyType: "acknowledgement",
    subject: "",
    updatedAt: null,
  };
}
