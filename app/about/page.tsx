import { PhilMascot } from "@/components/phil/PhilMascot";
import { PhilTip } from "@/components/phil/PhilMascot";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-5 md:px-10 py-16">
      <div className="grid md:grid-cols-2 gap-10 items-center mb-16">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-coral mb-2">About Don&apos;t Bite</p>
          <h1 className="font-display text-4xl md:text-5xl font-black text-navy mb-4">
            A passion project
          </h1>
          <p className="text-lg text-navy/70 leading-relaxed">
            I built Don&apos;t Bite because I kept seeing the same people get caught by the same
            tricks — and I wanted to do something about it. This isn&apos;t a money grab. It&apos;s a
            not-for-profit idea aimed at helping everyday people spot scams before they get
            hurt.
          </p>
        </div>
        <PhilMascot pose="sign" size={260} className="mx-auto animate-float" />
      </div>

      <div className="space-y-8 mb-16">
        <Card>
          <h2 className="font-bold text-xl text-navy mb-3">Why I made this</h2>
          <div className="space-y-4 text-navy/70 leading-relaxed">
            <p>
              Big companies run phishing drills for their staff. Banks train their teams on
              fraud. But the people who actually need that training — mums, dads, grandparents,
              anyone who shops online — usually get nothing until it&apos;s too late.
            </p>
            <p>
              I wanted to change that. Don&apos;t Bite is my way of giving people a safe place to
              practise: realistic drills, instant feedback from Phil, and no real risk if you
              click the wrong link. I&apos;m not trying to build the next unicorn startup. I just
              want fewer people losing money to scams they could have spotted.
            </p>
          </div>
        </Card>

        <PhilTip>
          I&apos;m Phil — part fish, part detective, all about keeping you safe. I used to be on
          the wrong side of the hook, but now I teach people my old tricks so they don&apos;t fall
          for them. Think of me as your scam-spotting sidekick!
        </PhilTip>

        <Card>
          <h2 className="font-bold text-xl text-navy mb-3">Where it started</h2>
          <div className="space-y-4 text-navy/70 leading-relaxed">
            <p>
              I spent years in banking — mostly credit card disputes, chargebacks, and fraud.
              Day after day, different customers would call with the same story: a &quot;free
              trial&quot; that wasn&apos;t free, a miracle cure that kept billing, a subscription
              buried in fine print they never meant to agree to. Tricky marketing ploys, over
              and over again.
            </p>
            <p>
              Often the money was already gone. I&apos;d have to explain why a chargeback was
              declined — because they&apos;d genuinely authorised the payment, even when they felt
              tricked. The argan oil pills, the weight-loss blends, the celebrity-endorsed
              miracle cures — I&apos;d seen them all before. It wasn&apos;t one unlucky person. It was
              the same patterns, again and again.
            </p>
            <p>
              That&apos;s when it clicked for me. People shouldn&apos;t have to learn these lessons
              the expensive way. I couldn&apos;t fix the whole problem from inside a bank, but I
              could build something that helps people spot the tricks before they bite. So I
              did.
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="font-bold text-xl text-navy mb-3">Where I&apos;m headed</h2>
          <p className="text-navy/70 leading-relaxed">
            Right now this is a working mockup — fictional brands like SecureBank and FastPost,
            everything stored locally in your browser. Long term, I&apos;d love to partner with
            banks, platforms, and couriers to make drills even more realistic with authorised
            branding. I&apos;m not sure they&apos;ll go for it, but it&apos;s worth a try. The goal stays
            the same: help people before the scammers get to them.
          </p>
        </Card>
      </div>

      <div className="text-center">
        <Button href="/signup" size="lg">
          Give it a go
        </Button>
      </div>
    </div>
  );
}
