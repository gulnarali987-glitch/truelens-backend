import React, { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "What is TrueLense?",
    a: "TrueLense is a tool that checks whether text, images, article links, QR codes and payment screenshots look AI-generated, edited or risky. You get a clear verdict, a confidence score and the reasons behind it.",
  },
  {
    q: "What can I check?",
    a: "Five things: pasted text, images, article URLs, QR codes, and payment screenshots. Each has its own tab in the workspace.",
  },
  {
    q: "How accurate is it?",
    a: "No AI detector is 100% accurate. TrueLense gives you a strong signal, not proof. Treat the result as one input in your decision, especially for anything important.",
  },
  {
    q: "Why does the text checker need at least 300 characters?",
    a: "Detecting AI writing needs enough text to look at. Very short passages don't give reliable results, so the Verify button unlocks once you reach 300 characters. A live counter shows how close you are.",
  },
  {
    q: "Do I need an account?",
    a: "No. You can try 5 free checks without signing up. If you create a free account, you get 5 checks every month, and you can upgrade any time for more.",
  },
  {
    q: "What do the paid plans include?",
    a: "Paid plans give you more checks per month, from 50 up to unlimited. You can pay monthly or yearly, and yearly saves 20%. See the Pricing page for the current plans and prices.",
  },
  {
    q: "How do I pay, and is it safe?",
    a: "Payments are handled by Razorpay. You can use cards, UPI or net banking. Your card or bank details go to Razorpay directly, and TrueLense never sees or stores them.",
  },
  {
    q: "Does my plan renew automatically?",
    a: "No. A monthly plan lasts 30 days and a yearly plan lasts 365 days from the day you pay. You are not charged again automatically, so you simply renew when it ends.",
  },
  {
    q: "What happens when I use up my checks?",
    a: "You'll be asked to upgrade. Your check count resets at the start of each month.",
  },
  {
    q: "Does the payment screenshot checker confirm that I was paid?",
    a: "No. It only checks whether the screenshot looks edited or AI-made. It cannot tell you whether the money arrived. Always confirm in your own bank or UPI app.",
  },
  {
    q: "What does the QR code checker do?",
    a: "It reads the QR code and looks at the link inside for warning signs, such as unencrypted links, URL shorteners, raw IP addresses and suspicious domains. A clean result is not a guarantee of safety, so be careful before paying.",
  },
  {
    q: "Is my data stored?",
    a: "Your pasted text and uploaded files are sent to third-party detection services only to produce your result. TrueLense does not keep a copy of them. We only keep your account details and a count of how many checks you've used.",
  },
  {
    q: "How can I contact you?",
    a: "Visit the About page for our phone numbers. We're happy to help with questions, feedback and billing.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-[#EEF1F6] grain pt-24 pb-20">
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-3xl mx-auto px-6">
        <div className="label-tiny opacity-60">FAQ</div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-[#1B2340] mt-2 tracking-tighter" data-testid="faq-heading">
          Frequently asked questions
        </h1>
        <p className="opacity-70 mt-3">Quick answers about how TrueLense works.</p>

        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="bg-white hairline rounded-2xl overflow-hidden" data-testid={`faq-item-${i}`}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
                  aria-expanded={isOpen}
                >
                  <span className="font-display text-lg font-semibold text-[#1B2340]">{f.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-[#1B2340] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && <div className="px-6 pb-5 opacity-80 leading-relaxed">{f.a}</div>}
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <div className="opacity-70">Still have a question?</div>
          <Link to="/about" className="btn-pill inline-block mt-3 bg-[#1B2340] text-[#EEF1F6]" data-testid="faq-contact">
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
