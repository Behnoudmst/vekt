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
  const [isSavingSettings, startSavingSettings] = useTransition();

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    startSavingSettings(async () => {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ RETENTION_DAYS: Number(retentionDays) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        flash(data.error ?? "Failed to save settings", "err");
        return;
      }
      const data = await res.json();
      setSettings((prev) => ({ ...prev, RETENTION_DAYS: String(data.RETENTION_DAYS) }));
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
        <form onSubmit={handleSaveSettings} className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="retention-days" className="text-xs">Retention period (days)</Label>
            <Input id="retention-days" type="number" min={1} max={3650} required value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} className="h-8 w-28 text-sm" />
          </div>
          <Button type="submit" size="sm" disabled={isSavingSettings}>
            {isSavingSettings && <CircleNotchIcon className="size-4 animate-spin mr-1" />}
            Save
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
