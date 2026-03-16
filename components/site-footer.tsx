import { COMPANY_NAME } from "@/lib/brand";
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="mx-auto flex h-[5vh] max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.</p>
          <span className="hidden sm:inline text-border">|</span>
          <a
            href="https://vekt.behnoud.net"
            target="_blank"
            rel="noopener"
            className="hover:text-foreground transition-colors underline underline-offset-3"
          >
            Powered by Vekt
          </a>
        </div>
        <Link
          href="/privacy"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-3"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
