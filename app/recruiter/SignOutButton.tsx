"use client";

import { Button } from "@/components/ui/button";
import { SignOutIcon } from "@phosphor-icons/react";
import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      <SignOutIcon data-icon="inline-start" />
      Sign out
    </Button>
  );
}
