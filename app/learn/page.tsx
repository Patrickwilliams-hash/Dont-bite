import Link from "next/link";
import { learnArticles } from "@/lib/learn-content";
import { PhilPeekWidget } from "@/components/phil/PhilPeekWidget";
import { Card } from "@/components/ui/Card";
import { BookOpen } from "lucide-react";

export default function LearnPage() {
  return (
    <>
      <div className="max-w-5xl mx-auto px-5 md:px-10 py-16">
        <p className="text-sm font-black uppercase tracking-widest text-coral mb-2">Scam library</p>
        <h1 className="font-display text-4xl md:text-5xl font-black text-navy mb-4">
          Know the tricks before they know you.
        </h1>
        <p className="text-lg text-navy/70 max-w-2xl mb-10">
          Free guides on the scams Phil simulates — from phishing emails to hidden subscription
          traps like the argan oil pills Patrick saw daily in chargeback disputes.
        </p>

        <div className="grid md:grid-cols-2 gap-5">
          {learnArticles.map((article) => (
            <Link key={article.slug} href={`/learn/${article.slug}`}>
              <Card className="h-full hover:shadow-xl hover:border-orange/20 transition-all cursor-pointer">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-orange shrink-0 mt-1" />
                  <div>
                    <span className="text-xs font-bold text-coral uppercase tracking-wide">
                      {article.category}
                    </span>
                    <h2 className="font-bold text-navy text-lg mt-1 mb-2">{article.title}</h2>
                    <p className="text-navy/60 text-sm leading-relaxed">{article.summary}</p>
                    <p className="text-xs text-navy/40 mt-3">{article.readTime} read</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      <PhilPeekWidget />
    </>
  );
}
