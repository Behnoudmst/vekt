"use client";

import type { TemplateEntry } from "@/app/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CircleNotchIcon, EyeIcon } from "@phosphor-icons/react";
import React, { useState, useTransition } from "react";

type Props = {
  templates: Record<string, TemplateEntry>;
  setTemplates: React.Dispatch<React.SetStateAction<Record<string, TemplateEntry>>>;
  settings: Record<string, string>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  flash: (msg: string, kind: "ok" | "err") => void;
};

const EMAIL_TYPES = [
  { key: "APPLIED", label: "Application Received", description: "Sent immediately when a candidate submits their application." },
  { key: "SHORTLISTED", label: "Application Shortlisted", description: "Sent when the AI scores a candidate above the job threshold." },
  { key: "REJECTED", label: "Application Rejected", description: "Sent when the AI scores a candidate below the job threshold, or a recruiter rejects manually." },
  { key: "ACCEPTED", label: "Application Accepted", description: "Sent when a recruiter manually accepts a candidate." },
  { key: "DATA_RETENTION_WARNING", label: "Data Retention Warning", description: "Sent 7 days before a candidate's data is deleted (GDPR). Always sent regardless of opt-out." },
] as const;

const TEMPLATE_VARS = "{{candidateName}}, {{jobTitle}}, {{companyName}}, {{statusPageUrl}}, {{retentionDate}}";

const SAMPLE_VARS: Record<string, string> = {
  candidateName: "Jane Smith",
  jobTitle: "Senior Frontend Engineer",
  companyName: "Acme Corp",
  statusPageUrl: "https://example.com/status/preview",
  retentionDate: "1 January 2027",
};

function interpolatePreview(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_VARS[key] ?? `{{${key}}}`);
}

export default function EmailTemplatesSection({ templates, setTemplates, settings, setSettings, flash }: Props) {
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [isSavingTemplate, startSavingTemplate] = useTransition();
  const [showPreview, setShowPreview] = useState(false);

  const [emailDelayHours, setEmailDelayHours] = useState(String(settings.STATUS_EMAIL_DELAY_HOURS ?? "48"));
  const [isSavingEmailDelay, startSavingEmailDelay] = useTransition();

  function openTemplate(key: string) {
    setActiveTemplate(key);
    setEditSubject(templates[key]?.subject ?? "");
    setEditBody(templates[key]?.body ?? "");
  }

  function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTemplate) return;
    startSavingTemplate(async () => {
      const res = await fetch(`/api/admin/email-templates/${activeTemplate}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editSubject, body: editBody }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        flash(data.error ?? "Failed to save template", "err");
        return;
      }
      setTemplates((prev) => ({ ...prev, [activeTemplate]: { subject: editSubject, body: editBody } }));
      flash("Template saved", "ok");
    });
  }

  function handleSaveEmailDelay(e: React.FormEvent) {
    e.preventDefault();
    startSavingEmailDelay(async () => {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          RETENTION_DAYS: Number(settings.RETENTION_DAYS ?? 90),
          STATUS_EMAIL_DELAY_HOURS: Number(emailDelayHours),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        flash(data.error ?? "Failed to save settings", "err");
        return;
      }
      const data = await res.json();
      setSettings((prev) => ({ ...prev, STATUS_EMAIL_DELAY_HOURS: String(data.STATUS_EMAIL_DELAY_HOURS) }));
      flash("Email delay saved", "ok");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground -mt-2">
        Customise the emails sent to candidates at each stage. Supported variables: <code className="bg-muted px-1 py-0.5 rounded text-[11px]">{TEMPLATE_VARS}</code>
      </p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Status email delay</CardTitle>
          <CardDescription className="text-xs">
            Status-change emails (e.g. shortlisted, rejected) are held for this many hours before sending. Set to <strong>0</strong> to send immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveEmailDelay} className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email-delay-hours" className="text-xs">Delay (hours)</Label>
              <Input id="email-delay-hours" type="number" min={0} max={168} required value={emailDelayHours} onChange={(e) => setEmailDelayHours(e.target.value)} className="h-8 w-28 text-sm" />
            </div>
            <Button type="submit" size="sm" disabled={isSavingEmailDelay}>
              {isSavingEmailDelay && <CircleNotchIcon className="size-4 animate-spin mr-1" />}
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-2">
        {EMAIL_TYPES.map(({ key, label, description }) => (
          <Card key={key} className={`cursor-pointer transition-colors ${activeTemplate === key ? "border-primary" : "hover:border-muted-foreground/40"}`} onClick={() => openTemplate(key)}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
                </div>
                {templates[key]?.subject ? (
                  <Badge variant="secondary" className="text-xs shrink-0 ml-4">Configured</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs shrink-0 ml-4 text-muted-foreground">Not set</Badge>
                )}
              </div>
            </CardHeader>

            {activeTemplate === key && (
              <CardContent className="px-4 pb-4 border-t pt-4" onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleSaveTemplate} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`subject-${key}`} className="text-xs">Subject</Label>
                    <Input id={`subject-${key}`} required value={editSubject} onChange={(e) => setEditSubject(e.target.value)} placeholder="e.g. Application Received – {{jobTitle}}" className="h-8 text-sm" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`body-${key}`} className="text-xs">Body (HTML)</Label>
                    <Textarea id={`body-${key}`} required value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="<p>Hi {{candidateName}}, ...</p>" className="text-xs font-mono min-h-40 resize-y" />
                  </div>
                  <div className="flex justify-between gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowPreview(true)} disabled={!editBody}>
                      <EyeIcon className="size-4 mr-1" />
                      Preview
                    </Button>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setActiveTemplate(null)}>Cancel</Button>
                      <Button type="submit" size="sm" disabled={isSavingTemplate}>
                        {isSavingTemplate && <CircleNotchIcon className="size-4 animate-spin mr-1" />}
                        Save Template
                      </Button>
                    </div>
                  </div>
                </form>

                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                  <DialogContent className="max-w-2xl w-full">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-medium">Preview — {interpolatePreview(editSubject || "(no subject)")}</DialogTitle>
                    </DialogHeader>
                    <div className="rounded-md border overflow-hidden bg-white">
                      <iframe srcDoc={interpolatePreview(editBody)} title="Email preview" className="w-full min-h-[480px] border-0" sandbox="allow-same-origin" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Rendered with sample data: {Object.entries(SAMPLE_VARS).map(([k, v]) => `{{${k}}} = "${v}"`).join(" · ")}</p>
                  </DialogContent>
                </Dialog>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
