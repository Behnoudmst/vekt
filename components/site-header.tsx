import SignOutButton from "@/app/recruiter/SignOutButton";
import MobileMenu from "@/components/mobile-menu";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { COMPANY_NAME } from "@/lib/brand";
import Image from "next/image";
import Link from "next/link";
type Props = {
  /** Optional back link shown left of the logo area */
  backHref?: string;
  backLabel?: string;
};

export default async function SiteHeader({ backHref, backLabel }: Props) {
  const session = await auth();
  const email = session?.user?.email;
  const role = (session?.user as { role?: string } | undefined)?.role;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">

        {/* Left: back link + logo + nav */}
        <div className="flex items-center gap-1 min-w-0">
          {backHref && (
            <Button asChild variant="ghost" size="sm" className="-ml-2 shrink-0 text-muted-foreground hover:text-foreground">
              <Link href={backHref}>← {backLabel ?? "Back"}</Link>
            </Button>
          )}

          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-foreground hover:text-primary transition-colors shrink-0"
          >
            <div className="flex size-6 items-center justify-center rounded-md bg-primary">
              <Image src="/logo.png" alt="Logo" width={24} height={24} className="shrink-0" />
            </div>
            <span className="hidden sm:block tracking-tight">{COMPANY_NAME}</span>
          </Link>

          {email && (
            <>
              <span className="mx-1 hidden sm:block text-border select-none">|</span>
              <Link href="/recruiter">
                <Button size="sm" variant="ghost" className="hidden sm:flex text-muted-foreground hover:text-foreground h-8 px-3 text-xs font-medium">
                  Recruiter
                </Button>
              </Link>
            </>
          )}
          {role === "ADMIN" && (
            <Link href="/admin">
              <Button size="sm" variant="ghost" className="hidden sm:flex text-muted-foreground hover:text-foreground h-8 px-3 text-xs font-medium">
                Admin
              </Button>
            </Link>
          )}
        </div>

        {/* Right */}
        {email ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-48 bg-muted px-2.5 py-1 rounded-full">
              {email}
            </span>
            <span className="hidden sm:inline-flex">
              <SignOutButton />
            </span>
            <MobileMenu email={email} role={role} />
          </div>
        ) : (
          <nav className="flex items-center gap-1 shrink-0">
            <Button asChild size="sm" className="hidden sm:flex h-8 text-xs font-medium rounded-full px-4">
              <Link href="/login">Recruiter Login</Link>
            </Button>
            <MobileMenu email={email} role={role} />
          </nav>
        )}

      </div>
    </header>
  );
}
