import SignOutButton from "@/app/recruiter/SignOutButton";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { COMPANY_NAME } from "@/lib/brand";
import { BuildingsIcon } from "@phosphor-icons/react/dist/ssr";
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
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-[5vh] max-w-5xl items-center justify-between gap-4 px-6">
        {/* Left: optional back link + logo */}
        <div className="flex items-center gap-3 min-w-0">
          {backHref && (
            <Button asChild variant="ghost" size="sm" className="-ml-2 shrink-0">
              <Link href={backHref}>← {backLabel ?? "Back"}</Link>
            </Button>
          )}
          <Link
            href={"/"}
            className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors shrink-0"
          >
            <BuildingsIcon weight="fill" className="size-5 text-primary shrink-0" />
            <span className="hidden sm:block">{COMPANY_NAME}</span>
          </Link>
          {email && (
            <Link href="/recruiter" className="ml-auto">
              <Button size="sm" variant={"link"} className=" border-l pl-3 hidden sm:block truncate">
                Recruiter Dashboard
              </Button>
            </Link>
          )}
          {role === "ADMIN" && (
            <Link href="/admin">
              <Button size="sm" variant={"link"} className="border-l pl-3 hidden sm:block truncate">
                Admin
              </Button>
            </Link>
          )}
        </div>

        {/* Right: sign-out if logged in, otherwise public nav */}
        {email ? (
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-50">
              {email}
            </span>
            <SignOutButton />
          </div>
        ) : (
          <nav className="flex items-center gap-1 shrink-0">
           
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Recruiter Login</Link>
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
