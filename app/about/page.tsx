import { PhilTip } from "@/components/phil/PhilMascot";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-5 md:px-10 py-16">
      <section className="mb-12">
        <p className="text-sm font-black uppercase tracking-widest text-coral mb-2">About Don&apos;t Bite</p>
        <h1 className="font-display text-4xl md:text-5xl font-black text-navy mb-4">
          Why I built Don&apos;t Bite
        </h1>
        <p className="text-lg text-navy/70 leading-relaxed max-w-3xl">
          Don&apos;t Bite is built to give everyday people the kind of safe, realistic scam practice
          that large organisations already give their staff.
        </p>
      </section>

      <div className="space-y-8 mb-16">
        <Card>
          <h2 className="font-bold text-xl text-navy mb-4">Why I built Don&apos;t Bite</h2>
          <div className="space-y-4 text-navy/70 leading-relaxed">
            <p>
              Before creating Don&apos;t Bite, I worked in banking, including credit card fraud and
              chargebacks. I saw first-hand how often people were caught by scams and how often
              the same tricks worked again and again.
            </p>
            <p>
              The people being scammed weren&apos;t stupid or careless. They were ordinary people
              going about their lives. Sometimes they were busy. Sometimes they were worried.
              Sometimes the message arrived at exactly the right moment and looked convincing
              enough to make them act before they had time to think.
            </p>
            <p className="font-black text-navy text-lg">
              Smart people get tricked too.
            </p>
            <p>
              What struck me was that most scam education happens after the fact. We tell people
              to watch out for suspicious links, check the sender&apos;s address and be wary of urgent
              messages. That&apos;s useful advice, but knowing what to do and actually recognising a
              convincing scam in your inbox are two different things.
            </p>
            <p>
              Large organisations understand this. They don&apos;t just tell their employees about
              phishing — they test them. Staff receive realistic simulation emails, get the
              opportunity to practise spotting the warning signs, and learn from their mistakes in
              a safe environment.
            </p>
            <p>So I started wondering:</p>
            <p className="font-display text-2xl md:text-3xl font-black text-coral-dark leading-tight">
              &ldquo;Why should corporations get all the drills?&rdquo;
            </p>
            <p>
              What about our parents and grandparents? Families? Community groups? Small
              businesses? Or simply anyone who wants to get better at recognising scams before
              there&apos;s real money, personal information or stress involved?
            </p>
            <p>
              That&apos;s why I created Don&apos;t Bite.
            </p>
            <p>
              The idea is simple: give everyday people the opportunity to practise with realistic
              scam emails in their real inbox, but without the real-world consequences.
            </p>
            <p>
              If you spot the scam, great. If you don&apos;t, that&apos;s useful too. Instead of losing
              money or handing information to a criminal, you get an explanation from Phil showing
              you what you missed and what to look for next time.
            </p>
            <p>
              There&apos;s no embarrassment and no judgement. The goal isn&apos;t to catch people out.
            </p>
            <p className="font-black text-navy">It&apos;s to help people build better instincts.</p>
            <p>
              Because the best time to learn how convincing a scam can be is before you encounter
              the real thing.
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="font-bold text-xl text-navy mb-3">How Don&apos;t Bite helps</h2>
          <ol className="space-y-3 text-navy/75 leading-relaxed">
            <li>
              <span className="font-black text-navy">1.</span> You receive a safe training email
              in your real inbox.
            </li>
            <li>
              <span className="font-black text-navy">2.</span> You decide what you would normally
              do.
            </li>
            <li>
              <span className="font-black text-navy">3.</span> If you click or take the bait,
              Phil explains the warning signs.
            </li>
            <li>
              <span className="font-black text-navy">4.</span> You learn what to look for next
              time.
            </li>
            <li>
              <span className="font-black text-navy">5.</span> Over time, you build better
              scam-spotting instincts.
            </li>
          </ol>
        </Card>

        <Card>
          <h2 className="font-bold text-xl text-navy mb-3">Safe by design</h2>
          <ul className="space-y-2 text-navy/75">
            <li>No real passwords are collected.</li>
            <li>No banking details are collected.</li>
            <li>No sensitive form entries are stored.</li>
            <li>No shame-based reporting.</li>
            <li>Consent-based training.</li>
            <li>Results are intended for learning, not punishment.</li>
          </ul>
        </Card>

        <Card>
          <h2 className="font-bold text-xl text-navy mb-3">Who Don&apos;t Bite is for</h2>
          <p className="text-navy/70 leading-relaxed">
            Don&apos;t Bite is for everyday people who want better scam instincts: individuals,
            parents and grandparents, families, community groups, small businesses, and
            organisations wanting a more human approach to scam-awareness training.
          </p>
        </Card>

        <PhilTip>
          Phil is there to coach you, not catch you out.
        </PhilTip>
      </div>

      <div className="text-center space-y-4">
        <p className="text-navy/75 max-w-2xl mx-auto">
          Scams work because they often feel normal in the moment. Don&apos;t Bite helps people build
          the habit of stopping, checking and thinking before they click.
        </p>
        <Button href="/signup" size="lg">
          Give it a go
        </Button>
      </div>
    </div>
  );
}
