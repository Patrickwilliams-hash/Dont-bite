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
            About Don&apos;t Bite
          </h1>
          <p className="text-lg text-navy/70 leading-relaxed">
            Don&apos;t Bite helps people recognise scams by safely practising with realistic examples
            before they face the real thing.
          </p>
        </div>
        <PhilMascot pose="sign" size={260} className="mx-auto animate-float" />
      </div>

      <div className="space-y-8 mb-16">
        <Card>
          <h2 className="font-bold text-xl text-navy mb-3">A different way to learn</h2>
          <div className="space-y-4 text-navy/70 leading-relaxed">
            <p>
              Most scam education tells people what to watch for after the fact. Don&apos;t Bite is
              different. It gives people a safe way to experience realistic scam attempts, make
              mistakes without consequences, and learn what gave the message away.
            </p>
            <p>
              This is practical training designed to build better instincts in the moment, when
              emails feel urgent, familiar, or believable.
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="font-bold text-xl text-navy mb-3">Why it exists</h2>
          <div className="space-y-4 text-navy/70 leading-relaxed">
            <p>
              Scams are becoming more polished, personalised, and believable. They often look like
              normal delivery updates, bank messages, marketplace chats, or subscription reminders.
            </p>
            <p>
              The goal is not to make people paranoid. The goal is to help people pause, check,
              and feel more confident about what they click.
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="font-bold text-xl text-navy mb-3">How it works</h2>
          <ol className="space-y-3 text-navy/75">
            <li>
              <span className="font-black text-navy">1.</span> You receive a safe training email.
            </li>
            <li>
              <span className="font-black text-navy">2.</span> You decide what you would do.
            </li>
            <li>
              <span className="font-black text-navy">3.</span> Phil explains the warning signs
              and what to check next time.
            </li>
          </ol>
        </Card>

        <Card>
          <h2 className="font-bold text-xl text-navy mb-3">Safety and ethics</h2>
          <ul className="space-y-2 text-navy/75">
            <li>Don&apos;t Bite does not collect real passwords.</li>
            <li>It does not collect banking details.</li>
            <li>It does not shame users for mistakes.</li>
            <li>It is designed for consent-based training.</li>
            <li>Results are used for learning, not punishment.</li>
          </ul>
        </Card>

        <Card>
          <h2 className="font-bold text-xl text-navy mb-3">Who it&apos;s for</h2>
          <p className="text-navy/70 leading-relaxed">
            Don&apos;t Bite is for individuals who want to get better at spotting scams, families,
            community groups, small businesses, and organisations that want safer
            phishing-awareness drills.
          </p>
        </Card>

        <PhilTip>
          Phil is there to coach, not catch people out. He keeps feedback practical, friendly,
          and focused on what to look for next time.
        </PhilTip>

        <Card>
          <h2 className="font-bold text-xl text-navy mb-3">Built from real-world patterns</h2>
          <p className="text-navy/70 leading-relaxed">
            Don&apos;t Bite was shaped by repeated scam patterns seen in everyday financial disputes
            and fraud complaints. It&apos;s being built as a practical prototype with one clear goal:
            help people build safer click habits before real losses happen.
          </p>
        </Card>
      </div>

      <div className="text-center space-y-4">
        <p className="text-navy/75 max-w-2xl mx-auto">
          Scams work because they feel normal in the moment. Don&apos;t Bite helps you build the habit
          of stopping for a second before you click.
        </p>
        <Button href="/signup" size="lg">
          Give it a go
        </Button>
      </div>
    </div>
  );
}
