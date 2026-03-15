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
import {
    Briefcase,
    ChartBar,
    CircleNotch,
    ClipboardText,
    Gear,
    PlusCircle,
    Trash,
    UserCircle,
    Users,
    Warning,
} from "@phosphor-icons/react";
import { useState, useTransition } from "react";

type User = { id: string; email: string; role: string; createdAt: Date };

type Props = {
  currentUserId: string;
  initialUsers: User[];
  initialSettings: Record<string, string>;
  stats: { jobCount: number; candidateCount: number; evaluationCount: number };
};

export default function AdminPanel({
  currentUserId,
  initialUsers,
  initialSettings,
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
  const [isSavingSettings, startSavingSettings] = useTransition();

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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[89vh] bg-background">
      <main className="mx-auto max-w-4xl p-6 flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Gear weight="duotone" className="size-5 text-primary" />
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
            <Warning className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={<Briefcase weight="duotone" className="size-5 text-primary" />}
            label="Active Jobs"
            value={stats.jobCount}
          />
          <StatCard
            icon={<Users weight="duotone" className="size-5 text-primary" />}
            label="Candidates"
            value={stats.candidateCount}
          />
          <StatCard
            icon={<ChartBar weight="duotone" className="size-5 text-primary" />}
            label="Evaluations Run"
            value={stats.evaluationCount}
          />
        </div>

        <Separator />

        {/* Users section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <UserCircle weight="duotone" className="size-5 text-primary" />
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
                            <Trash className="size-4" />
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
                <PlusCircle weight="duotone" className="size-4 text-primary" />
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
                    {isAdding && <CircleNotch className="size-4 animate-spin mr-1" />}
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
            <ClipboardText weight="duotone" className="size-5 text-primary" />
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
                  <Label htmlFor="retention-days" className="text-xs">
                    RETENTION_DAYS
                  </Label>
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
                  {isSavingSettings && <CircleNotch className="size-4 animate-spin mr-1" />}
                  Save
                </Button>
              </form>
            </CardContent>
          </Card>
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
