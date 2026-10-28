# Blog post — KRA retrieval, made simple

Main long-form post plus copy-paste variants for X/Twitter, LinkedIn, WhatsApp status, and Instagram caption.

**Angle:** independent KRA retrieval service at **kra.akubrecah.com** — pay KES 20 via M-Pesa or Paystack, get your full PIN and tax compliance details in minutes, delivered on WhatsApp or email.
**Compliance guardrails baked in:** we are *not* affiliated with KRA; we never say "official certificate"; no certification claims we can't back.

---

## Main post (blog / Facebook note)

### I built a faster way to get your KRA PIN and tax records — here's the story

If you've ever needed your KRA PIN for a job application, a bank account, a tender document, or your landlord, you know the routine: create an itax account you haven't touched since the last filing season, reset a password you've forgotten, fight a captcha that thinks you're a robot pretending to be a robot, and navigate a portal built for tax officers, not for someone who just needs one document.

I got tired of that. So I built **kra.akubrecah.com**.

**What it does**

Enter your National ID or KRA PIN, and the portal retrieves your KRA records — your PIN, tax obligations, and registration details. The lookup preview is free. When you want the complete, printable version, it's **KES 20**, paid straight from your phone via **M-Pesa STK Push** (just confirm on your phone, no USSD gymnastics) or **Paystack** if you prefer card. Your document lands on **WhatsApp or email in minutes**.

**What it doesn't do**

It doesn't store your data. The live lookup runs against KRA systems in real time and the result is delivered to you — we don't keep a warehouse of Kenyan IDs and PINs. Pre-payment, sensitive details are masked. The full PIN in an ID-based search never travels in plaintext across the network; it's sealed cryptographically and only unsealed inside the payment flow. Think of it like a sealed envelope that only opens at the till.

**How the KES 20 works**

- Free: ID/PIN lookup preview
- KES 20: full record retrieval + downloadable document, delivered to WhatsApp/email
- KES 500/month for cyber cafés and power users: unlimited retrievals, monthly invoice, WhatsApp support

For the cyber café folks in Kimilili, Webuye, Bungoma and beyond — you know this use case better than anyone. Your customer walks in needing their PIN for an eCitizen application; you don't need to log into Itax and babysit a captcha. You run the lookup, pay once, hand them the printout, and move to the next customer.

**Honest disclaimers (because trust matters)**

- This is an **independent service**. It is **not affiliated with, endorsed by, or operated by the Kenya Revenue Authority**.
- For anything requiring a legally issued document straight from KRA (like a Tax Compliance Certificate for a tender), get it from KRA directly — that's the authoritative source and it's free.
- What we sell is speed and convenience: the difference between a 40-minute Itax session and a 2-minute chat.

**Why I built it this way**

I'm a developer, and I have opinions about how software serving Kenyans should behave:

- **Pay only when it works.** The M-Pesa prompt charges KES 20 only when the record is actually found. If the retrieval fails, you're not paying for a promise.
- **Under-payment is rejected, not "processed."** No "your transaction is being verified" limbo.
- **No data hoarding.** A privacy-first service shouldn't build the very database you'd be worried about.
- **WhatsApp is the interface.** Over 90% of Kenyan internet users are on WhatsApp. The bot lives where you already are — you can even run lookups entirely from a chat.

**Try it**

Head to **kra.akubrecah.com**, enter your ID number, see the masked preview free, and decide if the KES 20 is worth it to you. If you run a cyber café or handle documents for other people, ask the bot about the monthly plan.

Questions? Complaints? "This saved me during a tender deadline" stories? My DMs are open.

*Atre* — built in Kimilili, for Kenyans everywhere.

---

## X / Twitter thread (6 posts)

**1/6**
Getting your KRA PIN shouldn't take 40 minutes of Itax password resets and captcha roulette.

So I built kra.akubrecah.com 👇

**2/6**
How it works:
→ Enter National ID or KRA PIN
→ Free masked preview of your record
→ Pay KES 20 (M-Pesa STK or Paystack)
→ Full record + printable document, delivered to WhatsApp or email in minutes

**3/6**
Privacy-first by design:
- Live lookup against KRA — we don't hoard your data
- Sensitive details masked before payment
- Full PIN never travels in plaintext; it's crypto-sealed and only opened inside the payment flow

**4/6**
For cyber cafés & power users: KES 500/month gets you unlimited retrievals + monthly invoice + WhatsApp support. Your customer needs a PIN for eCitizen? Sorted in one chat, next customer please.

**5/6**
The honest bit: this is an independent service, NOT affiliated with KRA. Tenders needing a legally issued Tax Compliance Certificate? Get that from KRA directly — it's free. We sell speed: 2 minutes instead of 40.

**6/6**
Free lookup preview, KES 20 only when it works.

Try it: kra.akubrecah.com

---

## LinkedIn post

**I built a service that retrieves KRA records in under 2 minutes — kra.akubrecah.com**

Every Kenyan professional eventually needs their KRA PIN: onboarding at a new job, opening a bank account, applying for a tender, registering on eCitizen. And every time, the process is the same: forgotten Itax password, captcha loops, a portal designed for compliance workflows rather than retrieval.

So I built and shipped a retrieval portal:

▸ **Free preview** — enter a National ID or KRA PIN, see a masked record before paying anything
▸ **KES 20 full retrieval** — M-Pesa STK Push or Paystack, pay-per-result only
▸ **Delivery on WhatsApp or email in minutes** — printable, ready to forward
▸ **KES 500/month unlimited plan** for cyber cafés and document-handling businesses
▸ **Privacy by design** — live lookups, masked pre-payment data, cryptographically sealed transport for sensitive fields, no data warehouse of taxpayer records

Two things I want to be explicit about, because trust compounds:
1. This is an **independent service**, not affiliated with or endorsed by the Kenya Revenue Authority. For legally issued documents like the Tax Compliance Certificate, KRA remains the authoritative (and free) source.
2. Building payment rails for Kenya taught me that the hard part isn't the API — it's the entitlement logic: making sure a payment unlocks exactly what was paid for, nothing more. That's where most of the engineering went.

If you handle documents, run a cyber café, or have onboarded staff who lost their PIN — try the preview at **kra.akubrecah.com** and tell me what would make it better.

#Kenya #PropTech #Fintech #CivicTech #Mpesa #ProductEngineering

---

## WhatsApp status / broadcast (short)

🔥 Tired of Itax password resets just to get your KRA PIN?

kra.akubrecah.com
✅ Free lookup preview
✅ KES 20 full record — M-Pesa or Paystack
✅ Delivered to WhatsApp/email in minutes
✅ Cyber café unlimited plan @ KES 500/month

Not affiliated with KRA — just faster. Try it 👆

---

## Instagram / TikTok caption

Your KRA PIN in 2 minutes, not 40. 🇰🇪⚡

kra.akubrecah.com
1️⃣ Enter your ID or PIN (free preview)
2️⃣ Pay KES 20 — M-Pesa or card
3️⃣ Full record delivered to WhatsApp or email

Built for the tender deadline, the job onboarding, the bank account you needed yesterday.

Cyber cafés: unlimited monthly plan available — ask in the WhatsApp bot.

*Independent service — not affiliated with KRA.*

#Kenya #KRA #eCitizen #Kimilili #Bungoma #Mpesa #CyberCafe #TechKenya

---

## Posting notes

- Add the **og-image** before sharing links (currently missing — audit finding S2): a 1200×630 image with "KRA PIN in 2 minutes · KES 20 · kra.akubrecah.com" renders in every card preview.
- Until the sign-in gate is fixed (audit §0), shared links redirect visitors to a login wall. **Publish the post after the homepage is publicly reachable**, or the traffic will bounce.
- Best first link to share once live: `kra.akubrecah.com/retrieval-portal` (has FAQ + product schema), with the homepage as the brand link.
- Keep the disclaimer sentence in every variant — it's both legally wise and a differentiator in a space full of sketchy "agents."
