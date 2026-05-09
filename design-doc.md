# Dream Reflection App — Product Brief

## Vision & Philosophy

This is a **self-reflection app**, not a dream interpretation app. The core belief is that dreams are your subconscious sending you messages — especially common, recurring dream patterns. The app's job is not to tell you what your dream means. It's to ask you the right questions until _you_ realize what it means. The moment of self-recognition is the product.

The guiding principle: **"We don't interpret your dreams for you. We help you interpret them yourself."** This philosophy should be present in branding, onboarding, and app store positioning. The exact wording needs refinement, but the concept is central to everything.

Dreams are messy, layered, and hard to categorize. A dream about being chased might not _feel_ like a chase dream. A dream can contain multiple archetypes simultaneously. The app must respect this complexity rather than forcing premature categorization.

---

## Core UX Flow

The daily experience has two touchpoints: a **morning session** (~5 minutes) and an optional **evening reflection**.

### Morning Session

#### Step 1 — Capture (1-2 minutes)

Voice-first input with live transcription visible as the user speaks. The live transcript allows the user to correct mistranscriptions in real-time while still talking (e.g., "steampunk" transcribed as "steam pump"). Text input is also available as a primary option, not just a fallback — some users will prefer typing. The key insight is that dreams are ephemeral and fade fast, so capture needs to be frictionless. A big mic button with a simple prompt like "tell me what you dreamed" lets someone ramble stream-of-consciousness style while half-awake.

#### Step 2 — Gap-Fill

After the user dumps their dream, the AI identifies what's missing and asks for it. This step exists because people naturally lean toward sharing either specifics OR feelings, rarely both:

- **If the user gave mostly specifics** (play-by-play of events, settings, characters) → the AI asks about the emotional texture: "How did that feel? Were you panicking, or were you calm?"
- **If the user gave mostly feelings** (it felt suffocating, heavy, disorienting) → the AI asks for concrete details: "What was actually happening? Were you trapped somewhere, underwater, unable to move?"
- **If the dream is too abstract** → the AI tries to ground it in specifics and emotion both

This step should be 1-2 questions max. The goal is to have enough information (both factual and emotional) for accurate categorization.

#### Step 3 — Categorize

The AI maps the dream to one (or sometimes two) of the ~17-18 archetypes and presents it to the user for confirmation: "So it sounds like this is generally a dream about being chased. Does that sound right?"

The user can confirm or push back: "Actually, I think it's more about..." — and the AI adjusts. Once confirmed, the app shows a small visual card with the archetype name and a subtle animation. This card could also include a brief description of the archetype so the user builds "dream literacy" over time.

**Important: Gap-fill comes BEFORE categorization.** Without the emotional and specific details filled in, the AI will anchor to the wrong archetype. Example: a dream with a school bus and old classmates might look like a "past places" dream, but after gap-filling reveals the emotional core is about feeling socially out of step, it's actually a "social disconnection" dream.

#### Step 4 — Archetype-Specific Probing Question

One carefully chosen question tailored to the specific archetype and what the user has already shared. This is where the archetype framework earns its value — the AI knows that for chasing dreams, the critical variable is agency and the relationship to the pursuer. For falling dreams, it's about impact and whether you jolted awake. Each archetype has a different "unlock" question that gets to the heart of what the subconscious is processing.

The question should feel like genuine curiosity, not a clinical assessment. The model should be in the middle ground between prescriptive ("your dream means X") and passive ("what do you think it means?"). The sweet spot is offering a specific interpretive frame and asking if it resonates.

#### Step 5 — Interpretive Frame + Resonance Check

The AI offers a possible interpretation tied to the archetype, the specifics, and the emotions: "Based on what you're describing, it sounds like you're processing a situation where you feel outmatched but resourceful. The third-person perspective suggests you might be observing this pattern in yourself rather than being fully immersed in the stress of it."

Then the resonance check: "Does that land for you?"

If the user says no or partially — that pushback is often where the real insight lives. The user is now actively interpreting their own dream. The AI gave them something to react against. The app should handle "actually I think it's more about..." gracefully, and also handle "a little bit of all of those" since real human responses are rarely single-select.

#### Step 6 — Takeaway

A short, portable reflection or question to carry into the day. This closes the morning session.

### Evening Reflection (Optional)

A push notification before bed: "This morning you reflected on a dream about [theme]. Did anything today connect to that?"

This is where the real depth lives. Dreams process things already happening in waking life, so the odds are high that something during the day will rhyme with the morning's theme. This evening check-in creates the "oh wait" moment of connection.

For recurring dreams, the evening data becomes evidence over time. If someone keeps dreaming about falling and keeps connecting it to work stress every evening, after two weeks the app can surface: "Your subconscious has been trying to get your attention about this for a while."

The evening touchpoint also solves the 5-minute morning constraint — the deeper "connect the dream to your life" work happens when the user has more time and more context from their day.

---

## Dream Archetype Framework

These ~17-18 archetypes serve as an **internal routing system** for the AI's questioning strategy. They determine which questions to ask, not what the dream means. The user never needs to see the full taxonomy — the AI handles mapping.

### Physical / Spatial Dreams

1. **Being Chased** — Something is being avoided. Key variables: who/what is chasing, the feeling of agency (heavy legs vs. evasive and capable), whether you escape or get caught
2. **Falling** — Loss of control, feeling unsupported. Key variables: falling from where, did you land or jolt awake, was anyone watching
3. **Flying** — Ambition and freedom. Key variables: effortless soaring vs. struggling to stay up, obstacles vs. open sky, what's below you
4. **Water** — Emotions. Key variables: the state of water (calm/raging/murky), your position (in it/watching/drowning), whether you can breathe
5. **Natural Disasters** — Overwhelming situations. Key variables: type of disaster (tornado/earthquake/flood), your response (fleeing/sheltering/watching), survival
6. **Out-of-Control Vehicle** — Life direction and agency. Key variables: who's driving, what went wrong (brakes/steering/speed), destination

### Identity / Self Dreams

7. **Past Places** — Examining parts of your identity from another time. Key variables: the specific place (childhood home/school), condition of the place (pristine/decaying/changed), who's present, the emotional quality (nostalgic/unsettling)
8. **Death / Transformation** — Something is ending so something new can emerge. Key variables: whose death (your own/loved one/stranger), emotional response (grief/relief/numbness), what happens after the death
9. **Hidden Rooms** — Untapped potential, unexplored parts of self. Key variables: the room's quality (grand/dark/forgotten/full/empty), emotional reaction to discovery
10. **Being Naked / Exposed** — Vulnerability. Key variables: who's around, whether anyone notices, the feeling (shame/freedom/panic)

### Social / Performance Dreams

11. **Exam or Test** — Feeling evaluated. Key variables: type of test, preparedness level, whether you finish, the stakes
12. **Social Disconnection / Outsider** — Feeling out of step with the world around you. Key variables: what you can't parse or keep up with, whether it's generational/cultural/situational, the feeling (confusion vs. being left behind)
13. **Social Failure / Embarrassment** — Messing up in a social context. Key variables: what went wrong, who witnessed it, the intensity of the embarrassment. Different from naked dreams (exposure) and exam dreams (competence) — this is about social belonging through performance
14. **Being Watched / Performing** — Awareness of being perceived. Key variables: the audience, the performance context, the feeling (exposed/empowered/paralyzed)
15. **Meeting a Celebrity** — Status, recognition, and aspirational qualities. Key variables: who the celebrity is and what they represent, the relationship in the dream, how they made you feel

### Powerlessness Dreams

16. **Unable to Speak or Move** — Feeling unheard or powerless. Key variables: what you were trying to do, who needed to hear you, what was at stake
17. **Being Lost** — Feeling directionless. Key variables: the environment (city/forest/building), searching for something specific vs. just lost, alone vs. accompanied
18. **Losing Teeth** — Social anxiety and self-image. Key variables: how the teeth came out (crumbling/pulled/falling), social context, emotional reaction

### Meta Category

- **Recurring Dreams** — Sits on top of any archetype. The recurrence itself is meaningful. The app should track and surface recurring patterns over time, especially when connected to evening reflections.

### Fallback — Abstract / Uncategorizable Dreams

Some dreams are purely surreal or don't map to any archetype. In these cases, the AI leans entirely on emotional texture — what was the dominant feeling, what associations does the user have, what in waking life carries a similar emotional signature.

---

## Multi-Dream Handling

Users sometimes have dreams that "melt" from one scene into another — two or more distinct dream narratives in one night. The app should:

- Allow users to describe all of it in the capture phase without interruption
- Have the AI identify that multiple threads are present
- Ask the user which dream felt most emotionally charged / vivid
- Lead with the dominant dream for the morning session
- Optionally note the connection between dreams at the end: "It's interesting that your mind linked these two — what do you think the thread between them is?"

The "melting" between dreams may itself be meaningful — e.g., a childhood home dream morphing into being lost could be one thread about identity and direction, not two separate dreams.

---

## Educational Layer

Users who understand dream archetypes engage more deeply with the reflection process. Knowing about "chasing dreams" in advance means knowing what to pay attention to. Build dream literacy over time without making it feel like a textbook:

- **Post-interpretation archetype card**: After the morning session, show a brief "about this dream type" card. Show it _after_ the interpretation, not before — don't prime people before they share.
- **Weekly/monthly digest**: "This week your dreams touched on themes of control and exposure — here's what those patterns often point to."
- **In-app reference section**: A browseable guide to the different dream archetypes and what they typically point to, so users can self-educate at their own pace.

Over time, users will start recognizing archetypes as they wake up, which actually improves dream recall.

---

## Feature Ideas

### Core (MVP)

- Voice capture with live transcription + text input
- AI-driven gap-fill, categorization, probing, and interpretive framing
- Morning session flow (capture → gap-fill → categorize → probe → interpret → takeaway)
- Dream journal / history
- Archetype card display after categorization

### Retention & Depth

- Evening push notification reflection ("did anything today connect?")
- Recurring dream detection and pattern surfacing
- Weekly/monthly insight digests
- Dream literacy education cards
- Longitudinal pattern analysis ("this is the third time water appeared this month")

### Future Exploration

- AI-generated dream imagery/visualization
- Dream sharing (anonymized community insights)
- Integration with sleep tracking data
- Lucid dreaming support/prompts
- Export/journal compilation

---

## Competitive Landscape

### Category 1: Dream Dictionaries with AI

Apps like Dream Interpretation AI (Google Play), Dream Interpreter AI, and basic web tools. One-shot transaction: input dream, get meaning. No conversation, no guided reflection. These are the horoscope equivalent.

### Category 2: Conversational AI Interpreters

**DreamyBot** is the closest competitor and most philosophically aligned. Founded by Rebecca, who shares the belief that dreams are "less about decoding and more about noticing." Draws from Jung and Rycroft. Offers personal symbology tracking (identifies recurring themes/symbols), post-discussion summaries with reflection prompts and suggested actions, and a General Discussion mode for waking thoughts. Still in open beta, ~850 Android downloads. 4.9 rating.

**Key difference from our app**: DreamyBot still interprets _for_ you. The AI tells you what your dream means, then you can discuss further. Our app interprets _through_ you — the AI's job is to guide you to your own realization through structured questioning. The structured archetype-based questioning methodology vs. freeform LLM chat is the core structural differentiator.

### Category 3: Journal-First Apps with AI

**DreamSphere** — Guided dream journal with AI interpretation, science-backed methods, voice/text capture, emotional tone analysis, structured prompts. Has a "Life Moments" feature for recording waking experiences alongside dreams, but it's manual and passive, not prompted.

**Dreamy** — Voice-to-text logging, AI-generated dream artwork, pattern tracking, sleep sounds, lucid dreaming tools. Community features. Claims 100k+ users.

**Reflection.app** — General journaling app with a dream guide module. Static prompts like "reflect on a recurring dream." AI coach (Depth) for deeper self-discovery, but not dream-specific in its conversational approach.

### Our Unique Positioning

Nobody is doing the structured **capture → gap-fill → categorize → archetype-specific probing → user-driven interpretation → evening reconnection** flow. Nobody has the two-touchpoint daily rhythm (morning capture + evening life-connection). Nobody uses archetypes as an internal routing system for AI questioning strategy. The market is early — execution and differentiation matter more than being first.

---

## Design Tensions to Resolve

1. **Voice transcription quality** — Dreams produce unusual language ("steampunk sky ropes"). Need high-quality speech-to-text (Whisper-level). Live transcription is critical so users catch errors in real-time rather than reviewing after.

2. **Model directiveness** — Spectrum between "here's what your dream means" (too prescriptive, horoscope) and "what do you think?" (too passive, lazy therapist). Target the middle: offer a specific interpretive frame, ask if it resonates, welcome pushback.

3. **Session length** — Must be completable in ~5 minutes for morning. Voice capture (1-2 min), gap-fill exchange (30 sec), categorization confirmation (15 sec), probing question exchange (1 min), interpretive frame + resonance (1 min), takeaway (15 sec).

4. **Handling non-binary responses** — When asked "were you judging them, admiring them, or wishing you could do the same?" the real answer is often "a little of all three." The app must handle complexity and ambivalence, not force single selections.

5. **Abstract/uncategorizable dreams** — Need a graceful fallback that leans on emotional texture when no archetype fits.

6. **Archetype overlap** — Social failure vs. exam dream vs. naked dream can blur depending on the emotional core. The gap-fill step is what disambiguates — get the feelings first, then categorize.

---

## Real Dream Examples (From Brainstorming)

### Example 1: Steampunk Chase

**Dream**: Third-person perspective, steampunk sky-level scene with ropes, ladders, elevation changes, wood structures. Being pursued by a larger-than-life figure. Feeling evasive and capable — could jump down, move between ladders and ropes, had a balloon to change elevation. Not the typical heavy-legs chase feeling.

**Categorization**: Chasing + elements of flying/elevation
**Key insight from probing**: The dreamer felt outmatched but resourceful. The probing question "the person dancing wildly — were you judging them, admiring them, or wishing you could do the same?" led to a nuanced answer: "a little of all three — I admire them for being themselves despite everything, but also judge them because it's not socially acceptable, and if I did that I'd worry about repercussions."
**Takeaway**: Revealed a tension between wanting freedom of self-expression and fearing social cost.

### Example 2: School Bus

**Dream**: On a school bus with classmates from different eras (grade school + high school). A curly-haired classmate dancing wildly to an 80s song. Feeling of transition. Feeling out of touch socially, like not understanding Gen Alpha slang. The dancing felt strange — was it self-expression that's not accepted or normal?

**Categorization**: Social Disconnection / Outsider (NOT "past places" despite the school bus setting — the emotional core is about belonging, not nostalgia)
**Why gap-fill matters**: Without asking about the emotional texture, the AI would anchor to "past places" because of the school bus and old classmates. The feeling of being out of touch is what reveals the true archetype.
**Key probing question**: "The person dancing wildly to an 80s song while everyone else just watched — did that feel more like you were judging them, admiring them, or wishing you could do the same?"

---

## Business Context

This is a **standalone app** — completely separate from Leetcare. Different domain, different audience, different product.

---

## Open Questions

- Monetization model? Freemium with limited sessions? Subscription for evening reflections + pattern tracking?
- Native app (iOS/Android) or cross-platform? Voice-first suggests native might be better for microphone/notification integration.
- What LLM to use for the conversational AI? Needs to be warm, concise, and good at asking single probing questions. System prompt engineering will be critical.
- App name and brand identity — the philosophy of self-guided interpretation should be reflected in the name.
- How to handle the disclaimer/liability aspect? All competitors include "for entertainment purposes only" disclaimers. Need to position as self-reflection/journaling, not therapy.
- Should the archetype framework be static (fixed 17-18) or evolve as the AI encounters dreams that don't fit?
