"use client";

import type { User } from "@/app/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrashIcon } from "@phosphor-icons/react";
import React, { useTransition } from "react";

type Props = {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUserId: string;
  flash: (msg: string, kind: "ok" | "err") => void;
};

export default function UsersSection({ users, setUsers, currentUserId, flash }: Props) {
  const [isDeleting, startDeleting] = useTransition();

  function handleDelete(id: string, email: string) {
    startDeleting(async () => {
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

  return (
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
                  <Badge variant={u.role === "ADMIN" ? "default" : "secondary"} className="text-xs">
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  {u.id !== currentUserId && (
                    <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => handleDelete(u.id, u.email)} disabled={isDeleting} aria-label={`Delete ${u.email}`}>
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
  );
}
