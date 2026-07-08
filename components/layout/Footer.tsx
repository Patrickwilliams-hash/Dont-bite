import Link from "next/link";
import { BrandName } from "@/components/brand/BrandName";

export function Footer() {
  return (
    <footer className="mt-8 border-t border-navy/10 bg-cream-dark/50">
      <div className="max-w-6xl mx-auto px-5 md:px-10 py-12">
        <div className="grid md:grid-cols-3 gap-10 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <BrandName size="sm" />
            </div>
            <p className="text-sm font-extrabold text-muted">Don&apos;t take the bait.</p>
          </div>
          <div>
            <p className="font-extrabold text-navy mb-3 text-sm">Resources</p>
            <div className="flex flex-col gap-2 text-sm font-bold text-muted">
              <Link href="/learn" className="hover:text-coral-dark transition-colors">
                Scam Library
              </Link>
              <Link href="/how-it-works" className="hover:text-coral-dark transition-colors">
                How It Works
              </Link>
              <Link href="/signup" className="hover:text-coral-dark transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
          <div>
            <p className="font-extrabold text-navy mb-3 text-sm">Company</p>
            <div className="flex flex-col gap-2 text-sm font-bold text-muted">
              <Link href="/about" className="hover:text-coral-dark transition-colors">
                About Phil
              </Link>
              <Link href="/login" className="hover:text-coral-dark transition-colors">
                Log In
              </Link>
            </div>
          </div>
        </div>
        <div className="pt-6 border-t border-navy/10 text-xs font-bold text-muted flex flex-col md:flex-row justify-between gap-2">
          <p>Training service only. No personal data collected.</p>
          <p suppressHydrationWarning>© {new Date().getFullYear()} Don&apos;t Bite</p>
        </div>
      </div>
    </footer>
  );
}
