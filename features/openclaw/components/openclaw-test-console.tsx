"use client";

import { useState } from "react";
import { Loader2, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  OpenClawActionDescriptor,
  OpenClawActionExecutionResult,
} from "@/features/openclaw/integration";

export function OpenClawTestConsole({
  actions,
}: Readonly<{
  actions: OpenClawActionDescriptor[];
}>) {
  const enabledActions = actions.filter((action) => action.enabled);
  const [selectedAction, setSelectedAction] = useState<string>(
    enabledActions[0]?.action ?? "",
  );
  const [payload, setPayload] = useState(
    stringifySample(enabledActions[0]?.sampleInput ?? null),
  );
  const [result, setResult] = useState<OpenClawActionExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const currentDescriptor =
    actions.find((action) => action.action === selectedAction) ?? enabledActions[0] ?? null;

  async function runAction() {
    if (!currentDescriptor?.enabled) {
      toast.error("Cette action n’est pas encore ouverte à OpenClaw.");
      return;
    }

    setIsRunning(true);
    setResult(null);

    try {
      const parsedPayload = parsePayload(payload);
      const response = await fetch("/api/openclaw/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: currentDescriptor.action,
          input: parsedPayload,
        }),
      });

      const nextResult = (await response.json()) as OpenClawActionExecutionResult;
      setResult(nextResult);

      if (nextResult.ok) {
        toast.success(nextResult.message);
      } else {
        toast.error(nextResult.message);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Exécution OpenClaw impossible.";
      toast.error(message);
      setResult({
        action: currentDescriptor.action as OpenClawActionExecutionResult["action"],
        auditScope: `openclaw.${currentDescriptor.action}`,
        code: "error",
        data: null,
        kind: currentDescriptor.kind,
        message,
        ok: false,
      });
    } finally {
      setIsRunning(false);
    }
  }

  function handleActionChange(value: string) {
    setSelectedAction(value);
    const nextDescriptor = actions.find((action) => action.action === value);
    setPayload(stringifySample(nextDescriptor?.sampleInput ?? null));
    setResult(null);
  }

  return (
    <Card>
      <CardHeader className="space-y-3 border-b border-black/[0.06] pb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Console OpenClaw interne</CardTitle>
        </div>
        <CardDescription>
          Point de test progressif pour simuler les appels assistant sur les actions réellement exposées.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Action exposée
              </p>
              <Select
                value={selectedAction}
                onChange={(event) => handleActionChange(event.target.value)}
              >
                {actions.map((action) => (
                  <option
                    key={action.action}
                    value={action.action}
                    disabled={!action.enabled}
                  >
                    {action.label}
                    {action.enabled ? "" : " (à venir)"}
                  </option>
                ))}
              </Select>
            </div>

            {currentDescriptor ? (
              <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbf8f2]/85 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={currentDescriptor.kind === "write" ? "default" : "outline"}>
                    {currentDescriptor.kind === "write" ? "Write safe" : "Lecture"}
                  </Badge>
                  <Badge variant="outline">
                    {currentDescriptor.enabled ? "Exposée" : "Fermée"}
                  </Badge>
                  {currentDescriptor.permission ? (
                    <Badge variant="outline">{currentDescriptor.permission}</Badge>
                  ) : null}
                </div>
                <p className="mt-3 font-medium text-foreground">{currentDescriptor.label}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {currentDescriptor.description}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Exemple: {currentDescriptor.example}
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Payload JSON
              </p>
              <Textarea
                value={payload}
                onChange={(event) => setPayload(event.target.value)}
                className="min-h-[220px] font-mono text-xs"
                spellCheck={false}
              />
            </div>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={runAction}
              disabled={!currentDescriptor?.enabled || isRunning}
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Simuler l’appel
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Résultat
          </p>
          <div className="rounded-[1rem] border border-black/[0.06] bg-[#101722] p-4 text-xs text-white/90">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words">
              {JSON.stringify(result ?? { message: "Aucun appel lancé pour le moment." }, null, 2)}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function stringifySample(sampleInput: Record<string, unknown> | null) {
  return JSON.stringify(sampleInput ?? {}, null, 2);
}

function parsePayload(value: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return {};
  }

  return JSON.parse(trimmed) as unknown;
}
