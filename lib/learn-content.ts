export interface LearnArticle {
  slug: string;
  title: string;
  summary: string;
  category: string;
  readTime: string;
  philTip: string;
  redFlags: string[];
  example: string;
  sections: { heading: string; body: string }[];
}

export const learnArticles: LearnArticle[] = [
  {
    slug: "phishing-emails",
    title: "Phishing Emails: Spot the Hook",
    summary: "Learn to identify fake emails designed to steal your login details or trick you into paying.",
    category: "Email Scams",
    readTime: "5 min",
    philTip:
      "I used to love urgent emails — they work because panic shuts off your brain. Always pause before you click!",
    redFlags: [
      "Urgent language: 'Act now', 'Account suspended', 'Verify immediately'",
      "Sender address doesn't match the real company domain",
      "Generic greetings: 'Dear Customer', 'Dear User'",
      "Suspicious links — hover to check the real URL",
      "Unexpected attachments, especially .zip or .exe files",
      "Spelling and grammar mistakes",
    ],
    example:
      "You receive an email from 'PayPa1 Security' (note the '1' instead of 'l') saying your account will be closed unless you verify within 2 hours. The link goes to paypal-secure-login.net — not paypal.com.",
    sections: [
      {
        heading: "What is phishing?",
        body: "Phishing is when scammers send fake emails pretending to be from banks, couriers, government agencies, or popular services. The goal is to trick you into clicking a link and entering your login details, payment info, or personal data on a fake website.",
      },
      {
        heading: "Why it works",
        body: "Phishing exploits urgency and authority. When an email says your bank account will be locked, your natural reaction is to fix it immediately. Scammers count on you not checking the sender address or link URL in the heat of the moment.",
      },
      {
        heading: "What to do",
        body: "Never click links in unexpected emails. Instead, open your browser and type the company's website address directly. If you're worried about your account, call them using the number on their official website or your bank card — not a number in the email.",
      },
    ],
  },
  {
    slug: "hidden-subscriptions",
    title: "Hidden Subscriptions & Free Trial Traps",
    summary: "The argan oil and weight-loss pill scams — how 'free' trials become $90/month charges.",
    category: "Devious Marketing",
    readTime: "6 min",
    philTip:
      "Free isn't free if you have to give your card number. That's the oldest trick in my book — and I should know!",
    redFlags: [
      "'Free trial' that requires credit card upfront",
      "Auto-renewal buried in tiny text or terms & conditions",
      "Pre-checked boxes agreeing to recurring charges",
      "Cancellation only by phone, with long hold times",
      "Celebrity endorsements on social media ads",
      "Miracle health claims: 'Lose 10kg in a week'",
    ],
    example:
      "You click a Facebook ad for a 'free sample' of Argan Oil Weight Loss pills. You pay $4.95 shipping. Two weeks later, $89.95 appears on your statement from a company you've never heard of. When you call your bank, they say you authorised it — because you agreed to the terms on that signup page.",
    sections: [
      {
        heading: "How the trap works",
        body: "These companies advertise heavily on social media with celebrity endorsements and before/after photos. The signup page offers a 'free trial' or 'just pay shipping' deal. Buried in the terms — often in tiny grey text — is an agreement to auto-renew at $60–$120/month after 14 days.",
      },
      {
        heading: "Why chargebacks often fail",
        body: "From experience in bank chargeback teams: customers genuinely didn't read the fine print, but they did technically agree. The merchant shows the signup page with the auto-renewal terms, the timestamp, and the IP address. Banks often rule in favour of the merchant because the customer authorised the transaction, even if they didn't understand what they were agreeing to.",
      },
      {
        heading: "How to protect yourself",
        body: "Never give card details for a 'free' product. Read the cancellation policy before signing up. Use a virtual card number with a spending limit. Set a phone reminder to cancel before the trial ends. Check your statements weekly. If you see an unexpected charge, contact your bank immediately — but know that prevention is far easier than dispute.",
      },
    ],
  },
  {
    slug: "social-engineering",
    title: "Social Engineering: The Human Hack",
    summary: "When scammers manipulate you through phone calls, texts, and impersonation — no malware needed.",
    category: "Social Engineering",
    readTime: "5 min",
    philTip:
      "The best scams don't need fancy technology — they just need you to trust a friendly voice on the phone.",
    redFlags: [
      "Caller claims to be from your bank, IRD, or Microsoft",
      "Asks you to install remote access software (TeamViewer, AnyDesk)",
      "Requests gift cards or cryptocurrency as payment",
      "Creates fear: 'Your computer has a virus', 'You owe tax'",
      "Pressures you not to tell anyone — 'this is confidential'",
      "Spoofed phone numbers that look legitimate",
    ],
    example:
      "You get a call from someone saying they're from Spark Security. They say your internet has been compromised and hackers are accessing your bank account right now. They ask you to download TeamViewer so they can 'fix it' — but they're actually accessing your computer to steal your banking details.",
    sections: [
      {
        heading: "What is social engineering?",
        body: "Social engineering is manipulating people into giving up confidential information or taking actions they wouldn't normally take. Unlike technical hacking, it exploits human psychology — trust, fear, urgency, and helpfulness.",
      },
      {
        heading: "Common tactics",
        body: "Phone scams impersonating banks or government agencies. Tech support scams claiming your computer is infected. Romance scams building trust over weeks before asking for money. Boss/email scams where a 'manager' urgently requests a wire transfer.",
      },
      {
        heading: "Your defence",
        body: "Hang up and call back on the official number. Never install software someone calls you about. No legitimate organisation asks for gift cards. Talk to a friend or family member before sending money. If it feels wrong, it probably is.",
      },
    ],
  },
  {
    slug: "fake-invoices",
    title: "Fake Invoices & Payment Redirects",
    summary: "PDF invoices, overdue payment demands, and supplier impersonation scams targeting businesses and individuals.",
    category: "Invoice Fraud",
    readTime: "4 min",
    philTip:
      "A PDF invoice looks official — but anyone can make a PDF. Check the bank account details against your records!",
    redFlags: [
      "Invoice from a supplier you don't recognise",
      "Changed bank account details on a familiar invoice",
      "PDF attachment with a payment link instead of normal bank transfer",
      "Overdue notices with threats of legal action",
      "Slightly different email address from usual supplier",
    ],
    example:
      "Your accountant receives an email from 'accounts@acme-supplies.co' (usually acme-supplies.com) with an overdue invoice for $4,200. The PDF shows updated bank account details. If paid, the money goes to the scammer — not your real supplier.",
    sections: [
      {
        heading: "How invoice fraud works",
        body: "Scammers monitor business email or guess supplier relationships. They send convincing invoices — often as PDF attachments — with altered payment details. Because PDFs look official and the amounts are plausible, accounts teams often pay without double-checking.",
      },
      {
        heading: "Who's at risk",
        body: "Small businesses are especially targeted because they may not have strict payment verification processes. But individuals can also receive fake invoices for services they never used — utility bills, toll charges, or subscription renewals.",
      },
      {
        heading: "Prevention",
        body: "Always verify changed bank details by phone using a number you already have — not one on the invoice. Set up a process for payment changes that requires verbal confirmation. Be suspicious of urgency around payments.",
      },
    ],
  },
  {
    slug: "romance-investment-scams",
    title: "Romance & Investment Scams",
    summary: "Long-con scams that build trust over weeks before asking for money or crypto investments.",
    category: "Long-Con Scams",
    readTime: "7 min",
    philTip:
      "Love is blind — and scammers know it. If someone you've never met asks for money, that's not romance, that's a red flag.",
    redFlags: [
      "Relationship moves very fast — 'I love you' within days",
      "They can never video call — always 'camera broken'",
      "Eventually asks for money: emergency, medical, travel",
      "Introduces a 'guaranteed' investment opportunity",
      "Encourages crypto investments on unknown platforms",
      "Profile photos look too perfect — reverse image search them",
    ],
    example:
      "After 3 months of daily messages, your online partner says they have a crypto trading tip from their uncle who works at a firm. They show you their 'profits' on a fake trading platform. You invest $5,000. The platform shows huge gains — but when you try to withdraw, you need to pay 'taxes' first. The money is gone.",
    sections: [
      {
        heading: "The long game",
        body: "Unlike phishing emails, romance and investment scams invest weeks or months building trust. Scammers create elaborate fake identities, share personal stories, and gradually introduce financial requests. By the time money is involved, victims often feel they know the person well.",
      },
      {
        heading: "Pig butchering",
        body: "A newer variant called 'pig butchering' combines romance with fake crypto investment platforms. Victims are 'fattened up' with fake profits shown on a fraudulent trading site, then encouraged to invest more. When they try to withdraw, they're told to pay fees or taxes first.",
      },
      {
        heading: "Protecting yourself and others",
        body: "Never send money to someone you haven't met in person. Reverse image search profile photos. Be sceptical of investment tips from online friends. Talk to someone you trust before making financial decisions. Report profiles to the platform.",
      },
    ],
  },
  {
    slug: "chargeback-myths",
    title: "Chargeback Myths: 'I Didn't Authorise It'",
    summary: "Why banks often can't reverse charges you genuinely agreed to — even if you didn't understand the terms.",
    category: "Banking Reality",
    readTime: "6 min",
    philTip:
      "Your bank isn't being mean — they genuinely can't help if you clicked 'I agree' on that signup page. Prevention beats dispute every time.",
    redFlags: [
      "Assuming your bank will always refund scam charges",
      "Not reading terms when signing up for free trials",
      "Waiting weeks to report unauthorised charges",
      "Not keeping records of cancellation attempts",
      "Expecting chargebacks for purchases you made while scammed",
    ],
    example:
      "You signed up for a free trial of diet pills, entering your card for $4.95 shipping. Three weeks later, $89.95 is charged. You call your bank to dispute it. They investigate and find you agreed to auto-renewal on the signup page. The chargeback is declined because you technically authorised the payment.",
    sections: [
      {
        heading: "What chargebacks actually cover",
        body: "Chargebacks are designed for unauthorised transactions — when someone uses your card without permission. They're not a 'get out of jail free' card for purchases you regret or didn't fully understand. If you entered your card details and clicked agree, the bank often considers that authorised.",
      },
      {
        heading: "The fine print problem",
        body: "Free trial scams are particularly hard to dispute because the merchant can show: the signup page with auto-renewal terms, your IP address, timestamp, and the card details you entered. Even if the terms were in tiny grey text below the fold, you agreed to them.",
      },
      {
        heading: "What actually helps",
        body: "Document everything: screenshots of cancellation pages, call logs, emails to the merchant. Report to your bank within days, not weeks. Contact the Commerce Commission or FMA for NZ-based scams. But most importantly: don't give your card to unknown sites in the first place. A $4.95 'free' sample isn't worth the $90/month risk.",
      },
    ],
  },
];

export function getArticle(slug: string): LearnArticle | undefined {
  return learnArticles.find((a) => a.slug === slug);
}
