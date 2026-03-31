"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  BriefcaseIcon,
  ChartBarIcon,
  CircleNotchIcon,
  ClipboardTextIcon,
  EnvelopeIcon,
  EyeIcon,
  GearIcon,
  PlusCircleIcon,
  TrashIcon,
  UserCircleIcon,
  UsersIcon,
  WarningIcon
} from "@phosphor-icons/react";
import { useState, useTransition } from "react";

type User = { id: string; email: string; role: string; createdAt: Date };
type TemplateEntry = { subject: string; body: string };

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

type Props = {
  currentUserId: string;
  initialUsers: User[];
  initialSettings: Record<string, string>;
  initialTemplates: Record<string, TemplateEntry>;
  stats: { jobCount: number; candidateCount: number; evaluationCount: number };
};

export default function AdminPanel({
  currentUserId,
  initialUsers,
  initialSettings,
  initialTemplates,
  stats,
}: Props) {
  // ── State ────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [settings, setSettings] = useState(initialSettings);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add-user form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"RECRUITER" | "ADMIN">("RECRUITER");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, startAdding] = useTransition();

  // Settings form
  const [retentionDays, setRetentionDays] = useState(
    String(settings.RETENTION_DAYS ?? "90"),
  );
  const [emailDelayHours, setEmailDelayHours] = useState(
    String(settings.STATUS_EMAIL_DELAY_HOURS ?? "48"),
  );
  const [isSavingSettings, startSavingSettings] = useTransition();
  const [isSavingEmailDelay, startSavingEmailDelay] = useTransition();

  // Email templates
  const [templates, setTemplates] = useState<Record<string, TemplateEntry>>(initialTemplates);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [isSavingTemplate, startSavingTemplate] = useTransition();
  const [showPreview, setShowPreview] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function flash(msg: string, kind: "ok" | "err") {
    setSuccess(null);
    setError(null);
    if (kind === "ok") setSuccess(msg);
    else setError(msg);
    setTimeout(() => (kind === "ok" ? setSuccess(null) : setError(null)), 4000);
  }

  // ── Add user ─────────────────────────────────────────────────────────────
  function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    startAdding(async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAddError(data.error ?? "Failed to create user");
        return;
      }
      const user = await res.json();
      setUsers((prev) => [...prev, user]);
      setNewEmail("");
      setNewPassword("");
      setNewRole("RECRUITER");
      flash(`Created ${user.email}`, "ok");
    });
  }

  // ── Delete user ───────────────────────────────────────────────────────────
  function handleDelete(id: string, email: string) {
    startAdding(async () => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        flash(data.error ?? "Failed to delete user", "err");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
      flash(`Deleted ${email}`, "ok");
    });
  }

  // ── Save settings ─────────────────────────────────────────────────────────
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

  // ── Save email delay ──────────────────────────────────────────────────────
  function handleSaveEmailDelay(e: React.FormEvent) {
    e.preventDefault();
    startSavingEmailDelay(async () => {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          RETENTION_DAYS: Number(retentionDays),
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

  // ── Email templates ────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[89vh] bg-background">
      <main className="mx-auto max-w-4xl p-6 flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <GearIcon weight="duotone" className="size-5 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage recruiter accounts, data retention, and monitor platform usage.
          </p>
        </div>

        {/* Flash messages */}
        {success && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
            <AlertDescription className="text-green-700 dark:text-green-400">
              {success}
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <WarningIcon className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={<BriefcaseIcon weight="duotone" className="size-5 text-primary" />}
            label="Active Jobs"
            value={stats.jobCount}
          />
          <StatCard
            icon={<UsersIcon weight="duotone" className="size-5 text-primary" />}
            label="Candidates"
            value={stats.candidateCount}
          />
          <StatCard
            icon={<ChartBarIcon weight="duotone" className="size-5 text-primary" />}
            label="Evaluations Run"
            value={stats.evaluationCount}
          />
        </div>

        <Separator />

        {/* Users section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <UserCircleIcon weight="duotone" className="size-5 text-primary" />
            <h2 className="text-base font-semibold">User Accounts</h2>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={u.role === "ADMIN" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {u.id !== currentUserId && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(u.id, u.email)}
                            disabled={isAdding}
                            aria-label={`Delete ${u.email}`}
                          >
                            <TrashIcon className="size-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Add user form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <PlusCircleIcon weight="duotone" className="size-4 text-primary" />
                Add User
              </CardTitle>
              <CardDescription className="text-xs">
                Create a new recruiter or admin account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5 sm:col-span-1">
                    <Label htmlFor="new-email" className="text-xs">Email</Label>
                    <Input
                      id="new-email"
                      type="email"
                      required
                      placeholder="recruiter@vekt.io"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-password" className="text-xs">Password (min 8 chars)</Label>
                    <Input
                      id="new-password"
                      type="password"
                      required
                      minLength={8}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-role" className="text-xs">Role</Label>
                    <select
                      id="new-role"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as "RECRUITER" | "ADMIN")}
                      className="h-8 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="RECRUITER">RECRUITER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                </div>
                {addError && (
                  <p className="text-xs text-destructive">{addError}</p>
                )}
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={isAdding}>
                    {isAdding && <CircleNotchIcon className="size-4 animate-spin mr-1" />}
                    Create User
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Settings section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ClipboardTextIcon weight="duotone" className="size-5 text-primary" />
            <h2 className="text-base font-semibold">Data Retention</h2>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">
                Candidate records older than <strong>RETENTION_DAYS</strong> will be eligible for
                automated data scrubbing. This value is stored in the database and can be changed at
                any time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSettings} className="flex items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="retention-days" className="text-xs">Retention period (days)</Label>
                  <Input
                    id="retention-days"
                    type="number"
                    min={1}
                    max={3650}
                    required
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(e.target.value)}
                    className="h-8 w-28 text-sm"
                  />
                </div>
                <Button type="submit" size="sm" disabled={isSavingSettings}>
                  {isSavingSettings && <CircleNotchIcon className="size-4 animate-spin mr-1" />}
                  Save
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Email Templates section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <EnvelopeIcon weight="duotone" className="size-5 text-primary" />
            <h2 className="text-base font-semibold">Email Templates</h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Customise the emails sent to candidates at each stage. Supported variables:{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-[11px]">{TEMPLATE_VARS}</code>
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
                  <Input
                    id="email-delay-hours"
                    type="number"
                    min={0}
                    max={168}
                    required
                    value={emailDelayHours}
                    onChange={(e) => setEmailDelayHours(e.target.value)}
                    className="h-8 w-28 text-sm"
                  />
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
              <Card
                key={key}
                className={`cursor-pointer transition-colors ${activeTemplate === key ? "border-primary" : "hover:border-muted-foreground/40"}`}
                onClick={() => openTemplate(key)}
              >
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
                        <Input
                          id={`subject-${key}`}
                          required
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          placeholder="e.g. Application Received – {{jobTitle}}"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`body-${key}`} className="text-xs">Body (HTML)</Label>
                        <Textarea
                          id={`body-${key}`}
                          required
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          placeholder="<p>Hi {{candidateName}}, ...</p>"
                          className="text-xs font-mono min-h-40 resize-y"
                        />
                      </div>
                      <div className="flex justify-between gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowPreview(true)}
                          disabled={!editBody}
                        >
                          <EyeIcon className="size-4 mr-1" />
                          Preview
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setActiveTemplate(null)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" size="sm" disabled={isSavingTemplate}>
                            {isSavingTemplate && <CircleNotchIcon className="size-4 animate-spin mr-1" />}
                            Save Template
                          </Button>
                        </div>
                      </div>
                    </form>

                    {/* Preview modal */}
                    <Dialog open={showPreview} onOpenChange={setShowPreview}>
                      <DialogContent className="max-w-2xl w-full">
                        <DialogHeader>
                          <DialogTitle className="text-sm font-medium">
                            Preview — {interpolatePreview(editSubject || "(no subject)")}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="rounded-md border overflow-hidden bg-white">
                          <iframe
                            srcDoc={interpolatePreview(editBody)}
                            title="Email preview"
                            className="w-full min-h-[480px] border-0"
                            sandbox="allow-same-origin"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Rendered with sample data: {Object.entries(SAMPLE_VARS).map(([k, v]) => `{{${k}}} = "${v}"`).join(" · ")}
                        </p>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
