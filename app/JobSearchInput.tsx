"use client";

import { Input } from "@/components/ui/input";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function JobSearchInput({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function handleChange(v: string) {
    setValue(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (v.trim()) params.set("q", v.trim());
      router.push(`/${params.toString() ? `?${params}` : ""}`);
    }, 300);
  }

  return (
    <div className="relative w-full max-w-sm">
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        className="pl-9"
        placeholder="Search positions…"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Search positions"
      />
    </div>
  );
}
