"use client";

import { Button } from "@/components/ui/button";
import { ListIcon, XIcon } from "@phosphor-icons/react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Props = {
  email?: string | null;
  role?: string | null;
};

export default function MobileMenu({ email, role }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close menu on ESC key press
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative sm:hidden" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
      >
        {open ? <XIcon className="size-5" /> : <ListIcon className="size-5" />}
      </Button>

      {open && (
        <div className="absolute right-0 top-10 z-50 min-w-48 rounded-lg border border-border bg-background/95 shadow-lg backdrop-blur-md">
          <nav className="flex flex-col p-2 gap-0.5">
            <Link href="/" onClick={() => setOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Home
              </Button>
            </Link>

            {email && (
              <Link href="/recruiter" onClick={() => setOpen(false)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Recruiter
                </Button>
              </Link>
            )}

            {role === "ADMIN" && (
              <Link href="/admin" onClick={() => setOpen(false)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Admin
                </Button>
              </Link>
            )}

            <div className="my-1 border-t border-border" />

            {email ? (
              <div className="flex flex-col gap-0.5">
                <span className="px-3 py-1.5 text-xs text-muted-foreground truncate">
                  {email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button
                  size="sm"
                  className="w-full text-xs font-medium rounded-full"
                >
                  Recruiter Login
                </Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
