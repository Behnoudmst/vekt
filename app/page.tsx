import { Badge } from "@/components/ui/badge";
import { COMPANY_NAME } from "@/lib/brand";
import { prisma } from "@/lib/prisma";
import {
  ArrowRight,
  Briefcase,
  MapPin
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import JobSearchInput from "./JobSearchInput";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = (q ?? "").trim();

  const listings = await prisma.job.findMany({
    where: {
      isActive: true,
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { location: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      location: true,
    },
  });

  return (
    <div className="flex min-h-[89vh] flex-col bg-background">

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-linear-to-br from-background via-muted/30 to-background">
        {/* Decorative grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right,currentColor 1px,transparent 1px),linear-gradient(to bottom,currentColor 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-72 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-20 flex flex-col items-center text-center gap-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-medium text-primary">
            <Briefcase className="size-3.5" weight="fill" />
            We&apos;re hiring
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
            <span className="text-primary">{COMPANY_NAME}</span> 
          </h1>
          <p className="max-w-md text-base text-muted-foreground leading-relaxed">
            Explore open roles and find your next opportunity. Every application is reviewed thoughtfully.
          </p>
        </div>
      </section>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">

        {/* Left — search + listings */}
        <div className="flex-1 min-w-0">
          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="size-5 text-primary" weight="fill" />
              <h2 className="text-lg font-semibold">Open Positions</h2>
              <Badge variant="secondary">
                {listings.length} {listings.length === 1 ? "role" : "roles"}
              </Badge>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <JobSearchInput defaultValue={search} />
          </div>

          {/* Listings */}
          {listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                <Briefcase className="size-7 text-muted-foreground" weight="duotone" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-foreground">
                  {search ? "No matching positions" : "No open positions right now"}
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {search
                    ? "Try a different search term."
                    : "We\u2019re not actively hiring at the moment. Check back soon \u2014 new roles are posted regularly."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/jobs/${listing.slug}`}
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
                      <div
                        className="prose prose-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed **:text-xs **:text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: listing.description }}
                      />
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

        {/* Right — Get Started card (sticky on desktop) */}
        {/* <div className="w-full lg:w-72 shrink-0">
          <Card className="lg:sticky lg:top-8">
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>Choose your destination</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              
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
        </div> */}

      </div>
    </main>

  </div>
  );
}

