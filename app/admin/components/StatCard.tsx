"use client";

import { Card, CardContent } from "@/components/ui/card";
import React from "react";

type Props = { icon: React.ReactNode; label: string; value: number };

export default function StatCard({ icon, label, value }: Props) {
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
