import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticle } from "@/lib/learn-content";
import { PhilTip } from "@/components/phil/PhilMascot";
import { PhilPeekWidget } from "@/components/phil/PhilPeekWidget";
import { RedFlagHighlight } from "@/components/drill/RedFlagHighlight";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

export async function generateStaticParams() {
  const { learnArticles } = await import("@/lib/learn-content");
  return learnArticles.map((a) => ({ slug: a.slug }));
}

export default async function LearnArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <>
      <article className="max-w-3xl mx-auto px-5 md:px-10 py-16">
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 text-sm font-bold text-navy/60 hover:text-orange mb-8"
        >
          <ArrowLeft size={16} /> Back to library
        </Link>

        <span className="text-xs font-bold text-coral uppercase tracking-wide">
          {article.category} · {article.readTime}
        </span>
        <h1 className="font-display text-4xl font-black text-navy mt-2 mb-4">
          {article.title}
        </h1>
        <p className="text-lg text-navy/70 leading-relaxed mb-8">{article.summary}</p>

        <PhilTip>{article.philTip}</PhilTip>

        <div className="mt-10 space-y-8">
          {article.sections.map((section) => (
            <div key={section.heading}>
              <h2 className="font-bold text-xl text-navy mb-3">{section.heading}</h2>
              <p className="text-navy/70 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="font-bold text-xl text-navy mb-4">Red flags to watch for</h2>
          <RedFlagHighlight flags={article.redFlags} />
        </div>

        <div className="mt-10 rounded-2xl bg-navy/5 border border-navy/10 p-6">
          <h2 className="font-bold text-navy mb-2">Real-world example</h2>
          <p className="text-navy/70 leading-relaxed italic">{article.example}</p>
        </div>

        <div className="mt-10 text-center">
          <Button href="/signup" size="lg">
            Practise with Phil&apos;s Drills
          </Button>
        </div>
      </article>
      <PhilPeekWidget />
    </>
  );
}
