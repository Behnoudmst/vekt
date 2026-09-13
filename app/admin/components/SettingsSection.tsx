"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircleNotchIcon } from "@phosphor-icons/react";
import React, { useState, useTransition } from "react";

type Props = {
  settings: Record<string, string>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  flash: (msg: string, kind: "ok" | "err") => void;
};

export default function SettingsSection({ settings, setSettings, flash }: Props) {
  const [retentionDays, setRetentionDays] = useState(String(settings.RETENTION_DAYS ?? "90"));
  const [autoReject, setAutoReject] = useState(
    settings.AUTO_REJECT_BELOW_THRESHOLD === "true",
  );
  const [isSavingSettings, startSavingSettings] = useTransition();

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    startSavingSettings(async () => {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          RETENTION_DAYS: Number(retentionDays),
          AUTO_REJECT_BELOW_THRESHOLD: autoReject,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        flash(data.error ?? "Failed to save settings", "err");
        return;
      }
      const data = await res.json();
      setSettings((prev) => ({
        ...prev,
        RETENTION_DAYS: String(data.RETENTION_DAYS),
        AUTO_REJECT_BELOW_THRESHOLD: String(data.AUTO_REJECT_BELOW_THRESHOLD ?? autoReject),
      }));
      flash("Settings saved", "ok");
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription className="text-xs">
          Candidate records older than <strong>RETENTION_DAYS</strong> will be eligible for automated data scrubbing. This value is stored in the database and can be changed at any time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="retention-days" className="text-xs">Retention period (days)</Label>
              <Input id="retention-days" type="number" min={1} max={3650} required value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} className="h-8 w-28 text-sm" />
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
            <div className="flex items-start gap-2.5">
              <input
                id="auto-reject"
                type="checkbox"
                checked={autoReject}
                onChange={(e) => setAutoReject(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
              />
              <Label htmlFor="auto-reject" className="text-xs font-medium cursor-pointer">
                Reject below-threshold candidates automatically
              </Label>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Off by default. While off, candidates scoring below the job threshold
              are marked <strong>Needs review</strong> and no rejection email is
              sent until a recruiter decides. Turning this on means a person can be
              rejected by automated processing alone — check your legal basis
              (GDPR Art. 22) before enabling it.
            </p>
          </div>

          <Button type="submit" size="sm" className="self-start" disabled={isSavingSettings}>
            {isSavingSettings && <CircleNotchIcon className="size-4 animate-spin mr-1" />}
            Save
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
