"use client";

import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function ProtectedDashboardGate() {
  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-16">
      <Card className="text-center border-navy/10 bg-white/90">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-blush/60 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-coral-dark" />
        </div>
        <h1 className="font-display text-3xl font-black text-navy mb-2">
          Oops — you need to log in first.
        </h1>
        <p className="text-navy/65 max-w-xl mx-auto mb-7 leading-relaxed">
          Your dashboard is private. Log in to continue your training, or create an account if
          you&apos;re new to Don&apos;t Bite.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button href="/login" size="sm">
            Log In
          </Button>
          <Button href="/signup" size="sm" variant="ghost">
            Create Account
          </Button>
          <Button href="/" size="sm" variant="ghost">
            Back to Home
          </Button>
        </div>
      </Card>
    </div>
  );
}
