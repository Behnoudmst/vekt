import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/prisma";
import {
  ArrowRight,
  BookOpenText,
  Briefcase,
  Lightning,
  MagnifyingGlass,
  MapPin,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default async function Home() {
  const listings = await prisma.jobListing.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
    },
  });

  return (
    <main className="flex min-h-screen flex-col items-center gap-10 p-8 bg-background pt-16 pb-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <Lightning data-icon weight="fill" className="size-10 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tight">Spark-Hire</h1>
        <p className="text-muted-foreground text-sm">
          Automated Recruitment Orchestration Engine
        </p>
      </div>

      {/* Open Positions */}
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Briefcase className="size-5 text-primary" weight="fill" />
            <h2 className="text-lg font-semibold">Open Positions</h2>
          </div>
          {listings.length > 0 && (
            <Badge variant="secondary">
              {listings.length} {listings.length === 1 ? "role" : "roles"}
            </Badge>
          )}
        </div>

        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <Briefcase className="size-7 text-muted-foreground" weight="duotone" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">No open positions right now</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                We&apos;re not actively hiring at the moment. Check back soon — new roles are posted regularly.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/apply?jobId=${listing.id}`}
                className="group block rounded-xl border border-border bg-card transition-all duration-150 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-4 p-5">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors duration-150 truncate">
                      {listing.title}
                    </p>
                    {listing.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        <span>{listing.location}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      {listing.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pt-0.5">
                    <span className="hidden text-xs font-medium text-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100 sm:block">
                      Apply
                    </span>
                    <ArrowRight
                      className="size-4 text-muted-foreground transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Separator className="max-w-2xl w-full" />

      {/* Nav */}
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Get Started</CardTitle>
          <CardDescription>Choose your destination</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild size="lg" className="w-full justify-start gap-3">
            <Link href="/apply">
              <UserCircle data-icon="inline-start" weight="regular" />
              Apply for a Position
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full justify-start gap-3"
          >
            <Link href="/recruiter">
              <MagnifyingGlass data-icon="inline-start" weight="regular" />
              Recruiter Dashboard
            </Link>
          </Button>
          <Separator />
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="w-full justify-start gap-3"
          >
            <Link href="/api-docs">
              <BookOpenText data-icon="inline-start" weight="regular" />
              API Documentation
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

