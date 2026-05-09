# Product Marketing Context

*Last updated: April 10, 2026*

## Product Overview
**One-liner:** AI-powered patient simulator and smart flashcards for pharmacy students to practice clinical skills.

**What it does:** LeetCare combines spaced repetition drug memorization (LeetCards) with AI patient simulations so pharmacy students can learn drug names, indications, and classes first, then immediately practice applying that knowledge in realistic clinical conversations. Professors can also create dynamic medical cases using AI.

**Product category:** Pharmacy education / clinical simulation software (students search for: "pharmacy flashcards", "OSCE practice", "drug name memorization", "patient simulation")

**Product type:** Freemium SaaS (web app + mobile app)

**Business model:** Subscription — Free ($0, 7 text scenarios/week), Plus ($6.99/mo, 15 text + 3 voice/week), Pro ($19.99/mo, unlimited text + 8 voice/week), Enterprise (custom, institutional). Weekly usage reset. LeetCards flashcards are free; paid tiers unlock voice simulations, full AI feedback, and advanced flashcard decks (star-tiered Brand-to-Indication and Generic-to-Side Effects).

## Target Audience
**Target users:** Pharmacy students (PY1 through P4) at US pharmacy schools, starting with University of Washington School of Pharmacy. Secondary: pharmacy professors creating patient cases.

**Decision-makers:** Individual students (B2C primary), pharmacy school faculty/deans (B2B institutional pilot)

**Primary use case:** Memorizing the Top 300 drug names (brand/generic) and practicing patient counseling conversations before real clinical encounters.

**Jobs to be done:**
- "Help me memorize brand and generic drug names efficiently so I don't fail the NAPLEX"
- "Give me a safe place to practice patient counseling so I'm not fumbling in my first real encounter"
- "Help me prepare for capstone OSCEs without needing a study partner"

**Use cases:**
- Daily commute flashcard review (5-20 min sessions on the bus)
- OSCE preparation before pharmacy skills lab exams
- NAPLEX drug knowledge review
- Clinical rotation prep (applying drug knowledge to patient scenarios)
- Professor-created patient cases for classroom exercises and exams

## Personas

### Persona 1: Raynor — The Survival-Mode P4
| Attribute | Details |
|-----------|---------|
| **Stage** | P4 (final year, graduating) |
| **Urgency** | High — NAPLEX in months, needs a job to pay off debt |
| **Primary motivation** | Fear of failure — can't afford to fail |
| **Study style** | With a partner, on the bus during commute (5:30-6:30 AM) |
| **Primary feature** | LeetCards (10-20 min daily brand/generic review) |
| **Price sensitivity** | Very high — froze at ~$2 for AI scenarios |
| **Discovery** | Word of mouth from a classmate |
| **Messaging angle** | "Don't fail the NAPLEX" |

### Persona 2: Allison — The Organized Early-Career Student
| Attribute | Details |
|-----------|---------|
| **Stage** | PY1 (first professional year) |
| **Urgency** | Medium — building foundations, wants residency |
| **Primary motivation** | Excellence — wants hospital/clinical, not retail |
| **Study style** | Alone, dedicated evening study blocks (9-11 PM) |
| **Primary feature** | LeetCards for brand/generic memorization; patient sim if afraid of failing OSCEs |
| **Price sensitivity** | High but movable by fear of failure |
| **Discovery** | Word of mouth from classmates (not professors, not app stores) |
| **Messaging angle** | "Get ahead for residency" |

**Shared insight:** Both discover tools through word of mouth, not ads or search. Referral mechanics and peer visibility matter more than paid acquisition.

## Problems & Pain Points
**Core problem 1 — Memorization:** Memorizing brand/generic drug names, indications, and classes is time-consuming, tedious, and requires a consistent daily schedule that's hard to maintain alongside rotations, work, and life.

**Core problem 2 — Application:** Patient counseling is difficult to practice. There's no safe way to rehearse clinical conversations without potentially harming a real patient or needing a study partner who may not be available.

**Why current solutions fall short:**
- **Anki:** Free and proven but steep learning curve, dated UI, no onboarding, no pharmacy-specific content, no clinical context — memorization only
- **Top 300 Drug Apps:** Fragmented market, low quality (3.5-4.0 ratings, <36 reviews), inferior algorithms (Leitner, no SRS), no updates
- **Practicing with friends:** Inconsistent availability, no structured feedback, doesn't scale
- **Physical flashcards/sticky notes:** No spaced repetition scheduling, tedious to maintain, easy to abandon
- **SimConverse:** B2B only ($42/student institutional license) — students can't access without their school buying it. Not pharmacy-specific
- **DDX by Sketchy:** Targets medical/PA/NP students, not pharmacy. Focuses on differential diagnosis, not drug counseling

**What it costs them:** Failed exams, poor OSCE performance, unpreparedness for clinical rotations, anxiety about real patient encounters, risk of not matching into residency programs.

**Emotional tension:** Fear of failure (especially P4s facing NAPLEX), imposter syndrome during clinical rotations, stress from inefficient study methods that waste scarce time, anxiety about counseling real patients for the first time.

## Competitive Landscape
**Direct:** None. No product combines drug memorization with AI patient simulation for pharmacy students.

**Indirect (memorization):**
- **Anki** — Free, massive ecosystem, established trust. Falls short: no pharmacy-specific content, no clinical context, steep learning curve, SM-2 algorithm (inferior to FSRS v4.5)
- **Top 300 Drug Apps (RxHero, FlashRX, RxFlip)** — Native mobile apps. Falls short: inferior algorithms (Leitner or none), low quality, tiny user bases (<36 ratings), outdated
- **Quizlet** — Professor-shared decks. Falls short: no spaced repetition, passive reviewing, no gamification

**Indirect (application):**
- **SimConverse** — $1.7M ARR, 50+ institutions, voice-first AI simulation. Falls short: B2B only (no individual access), not pharmacy-specific, no memorization component, assumes students already know the material
- **DDX by Sketchy** — $10-20/mo, expert-vetted cases, strong brand. Falls short: targets medical students (not pharmacy), focuses on differential diagnosis not drug counseling
- **Geeky Medics** — Focused on med students. Falls short: UI/UX issues make it hard to know what to do next, no clear task progression

**Indirect (manual methods — the real competition):**
- Physical flashcards on walls and index cards
- Practicing OSCEs with friends in study groups
- Reading the textbook and hoping for the best
- Doing nothing

## Differentiation
**Key differentiators:**
- **The memorization-to-application loop** — learn drug names first, then practice using them with an AI patient. No other tool connects both steps
- **FSRS v4.5 algorithm** — technically superior spaced repetition vs. every competitor (SM-2, Leitner, or none)
- **Pharmacy-specific AI patient simulation** — every other sim tool targets medical students
- **B2C direct access** — any student can start immediately, no institutional license required
- **Task-based guidance system** — structured rubric with auto-checking so students know what to do next (unlike Geeky Medics)
- **Voice simulation with emotional expression** — 20 Inworld voices with emotional markup for realistic patient encounters

**How we do it differently:** Students start with LeetCards to memorize drug names, indications, and classes through spaced repetition. Once they've built that foundation, they practice applying it by counseling AI patients who present with those conditions — in text or voice. Real-time task checking and AI evaluation provide structured feedback.

**Why that's better:** Memorization without application doesn't build clinical confidence. Application without memorization means students can't even finish the encounter. The integrated loop is more effective than using separate tools.

**Why customers choose us:** Curated pharmacy-specific content, zero setup (vs. Anki), modern UI with gamification (streaks, study paths, star tiers), free to start, available to any student without institutional approval.

## Objections & Anti-Personas

### Patient Simulation Objections
| Objection | Response |
|-----------|----------|
| "AI grading isn't reliable enough" (professor) | Students report feedback is specific and helpful. AJPE research publication pending validating AI evaluation accuracy vs. faculty assessment. The tool supplements, not replaces, faculty grading |
| "I don't want my cases in an AI system" (professor IP concerns) | Professors are very protective of cases they've built. LeetCare's case generator creates new cases from scratch — professors don't need to upload existing IP. Cases remain owned by the creator |
| "I don't know which scenario to pick" (student) | Known UX issue — students get stuck on the /practice page figuring out what to try. Need better onboarding/guidance for scenario selection |
| Tutorial is broken | Current bug prevents completion — blocks the onboarding funnel for patient simulations |

### LeetCards Objections
| Objection | Response |
|-----------|----------|
| "I already use Anki" | LeetCare's LeetCards uses FSRS v4.5 (Anki uses SM-2), comes pre-loaded with Top 300 drugs, and connects to patient practice — no setup required |
| "I can't remember to come back" (retention) | Web requires a bookmark — this is why the mobile app is in development. Push notifications and streak reminders help but aren't intense enough yet |
| "I feel punished for missing a day" | The "review mode" popup when returning after absence feels punishing instead of welcoming. Need to reframe: celebrate the return, not highlight the gap |
| "The streak notifications aren't enough" | Mobile streak-saver notifications need to feel more urgent when a streak is about to break — current intensity is too low |

### General Objections
| Objection | Response |
|-----------|----------|
| "AI tools aren't reliable / my professor says not to use AI" | LeetCare doesn't replace clinical education — it provides extra reps. Like a flight simulator: you still need flight school, but more practice hours make you better |
| "I can't afford another subscription" | LeetCards is completely free. The free tier includes 7 text scenarios per week. Only pay when you want voice practice or advanced decks |

**Anti-persona:**
- Students who have already passed the NAPLEX and are in practice (no longer need memorization)
- Medical/nursing students (content is pharmacy-specific)
- Students who only want a question bank for NAPLEX prep (that's UWorld RxPrep's market)

## Switching Dynamics
**Push (frustrations driving them away from current solution):**
- Sticky notes falling off the wall, disorganized physical flashcards
- Anki's steep learning curve and ugly interface
- Can't find a study partner to practice OSCEs with
- Existing drug apps are outdated and use inferior algorithms
- No feedback when practicing alone

**Pull (what attracts them to LeetCare):**
- Pre-loaded Top 300 drugs with zero setup
- Modern, polished UI that "just works"
- AI patient that responds realistically and gives structured feedback
- Spaced repetition that adapts to their pace
- Free to start, no credit card required
- Mobile app for studying on the bus

**Habit (what keeps them stuck with current approach):**
- Already invested time in Anki decks
- Comfortable with physical flashcard routine
- "This is how I've always studied"
- Professor gave us a Quizlet deck, so I'll just use that

**Anxiety (what worries them about switching):**
- "Will my progress transfer?"
- "Is this actually better than Anki or am I wasting time learning a new tool?"
- "What if I pay and don't use it?"
- Professor/preceptor skepticism about AI tools (though students themselves find the AI feedback specific and helpful — the trust gap is mainly with faculty, not students)

## Customer Language
**How they describe the problem:**
- "I'm really bad with generic vs brand since I don't have much retail experience"
- "Brand names were scarcely taught in pharmacy school"
- "They often have nothing to do with the generic name"
- "I wished I had more patient cases to practice with"

**How they describe us:**
- "When I get into the zone, it's easy to complete that many cards at once"
- "A few minutes of LeetCards a day filled all those gaps and even made it fun"
- "It's like LeetCode but for pharmacy"

**Words to use:** practice, review, master, confidence, clinical, patient counseling, drug knowledge, NAPLEX prep, OSCE prep, spaced repetition, smart flashcards, AI patient
**Words to avoid:** study tool (too generic), quiz app (too simplistic), game (undermines credibility), chatbot (sounds basic), artificial intelligence (say "AI" instead)

**Glossary:**
| Term | Meaning |
|------|---------|
| LeetCards | LeetCare's spaced repetition flashcard system for drug memorization |
| NAPLEX | North American Pharmacist Licensure Examination — the licensing exam every pharmacy graduate must pass |
| OSCE | Objective Structured Clinical Examination — standardized patient encounter exams in pharmacy school |
| Top 300 | The most commonly prescribed drugs that pharmacy students are expected to know |
| FSRS | Free Spaced Repetition Scheduler — the algorithm powering LeetCards (v4.5, superior to Anki's SM-2) |
| P4/PY1 | Fourth-year pharmacy student / First professional year — stages in the PharmD program |
| Brand/Generic | Brand name (e.g., Lipitor) vs. generic name (e.g., atorvastatin) of a drug |

## Brand Voice
**Tone:** Warm, encouraging, slightly informal — like a smart classmate who's one step ahead and genuinely wants to help you succeed. Never condescending. Cozy and safe — the whole point is to feel comfortable making mistakes.

**Visual aesthetic:** Warm indie game vibe — illustrated, cozy, inviting (see the "Choose Your Path" illustrations: a pharmacy counter scene and a late-night study desk with warm lighting). Soft colors, hand-drawn feel. The visual tone should lower the stakes and make students feel safe to try things.

**Style:** Direct and concise. Lead with the benefit, not the feature. Use "you" language. Short paragraphs. Conversational but credible. AI feedback prompts should channel the "smart classmate" voice — specific, helpful, encouraging, never punishing.

**Personality:** Supportive, practical, confident, pharmacy-native, slightly nerdy (the "LeetCode for pharmacy" vibe), cozy

## Proof Points
**Metrics:**
- 1,027 generic drugs and 1,126 brand products in the database
- FSRS v4.5 algorithm (state-of-the-art spaced repetition)
- AJPE research publication pending (AI evaluation accuracy vs. faculty assessment)
- 20 realistic AI voices with emotional expression

**Testimonials:**
> "Brand names were scarcely taught in pharmacy school and can be extremely difficult since they often have nothing to do with the generic name. A few minutes of LeetCards a day filled all those gaps and even made it fun." — Raynor Wales

> "I'm really bad with generic vs brand since I don't have much retail experience. When I get into the zone, it's easy to complete that many cards at once. I'm wondering if you'll make an app in the future? I think that would be really helpful to me and others as well. That way we can complete the cards while on break, taking public transportation etc." — CiCi

**Value themes:**
| Theme | Proof |
|-------|-------|
| Memorization made easy | 1,027 drugs pre-loaded, FSRS v4.5, zero setup vs. Anki |
| Safe practice environment | AI patients with realistic voice + emotional expression, structured feedback |
| Built by a pharmacy student | Founder is a PharmD candidate at UW, understands the pain firsthand |
| Pharmacy-specific | Only platform combining drug memorization + patient simulation for pharmacy |

## Goals
**Business goal:** 50 paid subscribers and 1,000 daily active users by June 2026. 5% free-to-paid conversion rate. $350+ MRR.

**Conversion action:** Sign up for free (LeetCards or patient scenario) -> daily usage habit -> hit free tier limit or need advanced decks -> upgrade to Plus/Pro.

**Current metrics (as of April 2026):**
- 56 user signups (0 paid), 3-5 new signups/month
- 2-4 daily active users (thisismekaylin, liu99, snajitalakar + founder)
- High landing page traffic (visitors checking out the site)
- Free-to-paid conversion: 0% (nobody is reaching the paywall trigger)
- MRR: $0
- Mobile app in TestFlight/beta — close to App Store/Play Store submission, needs compliance points
- No social media presence (no accounts, no blog, only Reddit posts)
- Reminder emails not turned on for users yet (only founder). Founder's own experience: never opens them, card counts are inaccurate, em dashes feel AI-generated
- Mobile notifications have timing issues (sent at ignorable times) and streak-saver still fires after completing cards for the day

**Retention pattern (from PostHog session recordings):**
- Typical new user: completes tutorial, reviews ~20 cards, sees "come back tomorrow", never returns
- Power user pattern: spams 200+ cards in first session → comes back the next day
- Implication: users who reach a "critical mass" of engagement in session 1 are more likely to return. The 20-card session isn't enough to build the habit

**Acquisition channel:** Word of mouth is the primary (and best) channel. One friend (Raynor) stands up in class and tells students to try LeetCare. This is the main source of new signups. No other organic referral behavior observed from other students yet. No referral mechanism in the product.

**B2B / institutional pilot status:** Not actively pursued yet. Next step: set up meeting with UW professors after AJPE research is complete. Key pitch: reduce OSCE remediation rates by giving students more practice reps. Risk: professors may worry AI grading could make student scores worse, or that the tool threatens their role. Framing needs to be "supplement, not replace" — the research proving AI grades similarly to faculty is the key unlock, but must be positioned as "freeing up professor time" not "replacing professor judgment."

**Key gaps & conversion blockers:**
1. **Retention is the #1 problem** — users sign up but don't come back consistently enough to finish the brand/generic deck, so they never hit the paywall trigger
2. **No one reaches the paywall** — the conversion flow depends on finishing Brand→Generic and unlocking paid decks (Brand→Indication, Generic→Side Effects). Users aren't getting far enough
3. **Generic→Drug Class data integrity issues** — the next free deck after Brand→Generic has drug classes that don't make sense, which would erode trust if users got there
4. **No pricing page push** — nothing actively directs users toward the pricing page; they'd have to discover it on their own
5. **Web requires bookmark** — without a native app, there's no home screen icon or push notification to pull users back. Mobile app (in TestFlight) will fix this
6. **Tutorial bug** — current scenario tutorial has a bug preventing completion, blocking the patient simulation onboarding funnel
7. **Scenario selection paralysis** — students get stuck on /practice not knowing which scenario to try
8. **"LeetCare" search autocorrects to "LeetCode"** — no Google Search Console, no sitemap
9. **Email reminders broken/off** — not turned on for real users; when tested on founder, emails have inaccurate data and AI-sounding copy
10. **Mobile notification bugs** — streak-saver fires even after daily cards are completed; timing doesn't match when users are receptive
