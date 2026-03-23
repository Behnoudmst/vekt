"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LoginState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string };

export default function LoginPage() {
  const [state, setState] = useState<LoginState>({ status: "idle" });
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ status: "loading" });

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.status === 429) {
      setState({
        status: "error",
        message: "Too many login attempts. Please wait a few minutes and try again.",
      });
      return;
    }

    if (result?.error) {
      setState({ status: "error", message: "Invalid email or password." });
      return;
    }

    router.push("/recruiter");
    router.refresh();
  }

  return (
    <div className="flex min-h-[89vh] flex-col bg-background">
      <main className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader>
              <CardTitle>Recruiter Login</CardTitle>
              <CardDescription>
                Please login to access the recruiter dashboard and manage your
                job listings and candidates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="insert email here"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="insert password here"
                  />
                </div>

                {state.status === "error" && (
                  <Alert variant="destructive">
                    <WarningCircle />
                    <AlertTitle>Login failed</AlertTitle>
                    <AlertDescription>{state.message}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={state.status === "loading"}
                  className="w-full"
                >
                  {state.status === "loading" && (
                    <SpinnerGap
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  )}
                  {state.status === "loading" ? "Signing in…" : "Sign In"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
