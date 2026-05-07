---
name: mom-test
description: Customer-discovery interview design and analysis using Rob Fitzpatrick's Mom Test. Use when preparing or reviewing a customer interview guide, analyzing call notes for misleading signal, validating a product idea against real evidence, or auditing a discovery conversation. Covers the three rules, bad-data taxonomy (compliments/fluff/feature requests), good question patterns, commitment currencies (time/reputation/money), pre-call review, and post-call synthesis.
---

# The Mom Test

Help craft and review customer-discovery conversations that produce reliable signal instead of polite validation.

The job: keep questions anchored to the customer's life and past behavior; flag the bad-data patterns (compliments, fluff, ideas); push for commitment in the three currencies (time, reputation, money); identify the assumption you're most afraid to test.

Named after Rob Fitzpatrick's *The Mom Test* — questions so reliable that even a protective parent can't give you misleading answers.

## Two Modes

**Mode A — Pre-call review.** User shares a call guide, agenda, interview script, or proposed questions. Output: question-by-question critique with rule violations flagged and concrete replacements proposed; the three biggest unknowns this guide is actually testing; the "terrifying question" being avoided; the explicit commitment ask.

**Mode B — Post-call analysis.** User shares notes, a transcript, or recounts what happened. Output: bucketed quotes (gold / fluff / compliment / feature request / commitment signal); what was learned vs. what felt like learning; the next three questions to take into the next conversation.

If the user is preparing for a future call, Mode A. If they're processing one that already happened, Mode B. Ask which if ambiguous.

## The Three Rules

Every question in a discovery conversation must pass these:

1. **Talk about their life, not your idea.** The moment you describe your solution, the conversation is contaminated — they're now evaluating your feelings, not reporting their reality.
2. **Specifics in the past, not generics or futures.** "Walk me through the last time" beats "Would you ever" every time. Past behavior is the only reliable predictor; future-tense answers are systematically over-optimistic.
3. **Talk less, listen more.** Every word you say narrows the conversation toward your assumptions. Aim for the customer talking 70%+ of the time.

These rules apply most strictly during *discovery*. Once the call moves into showing a prototype or asking for commitment, the rules shift — see "Discovery vs. Validation Boundary" below.

## Bad Data Taxonomy

The three categories of misleading signal that feel like validation but aren't:

| Failure mode | What it sounds like | Why it's poison | Redirect |
|---|---|---|---|
| **Compliment** | "Great idea." "I love this." | Costs nothing to give. Politeness, not intent. | Deflect to behavior: "Glad it resonates — what do you do today when this comes up?" |
| **Fluff (generic)** | "I always..." "We usually..." "Everyone..." | Idealized self, not a real instance. | "When was the last time? Walk me through it." |
| **Fluff (hypothetical)** | "I might..." "I could see myself..." "Depends." | Speculation about a future self. | "What have you actually done in that situation so far?" |
| **Fluff (future promise)** | "I would buy that." "I'll definitely use it." | Sounds like commitment, costs nothing. | "Want to pre-order? Put down a deposit?" *(People stop lying when you ask for money.)* |
| **Feature request** | "You should add X." "If you had Y I'd use it." | Symptom, not diagnosis. The problem matters; the proposed solution rarely does. | Dig for motivation: "Why do you want that? What would it enable? How are you managing now?" |
| **Avoidance** | Won't schedule a follow-up. Won't intro you. "Check in later." | Negative signal disguised as politeness. | Treat as a soft "no" and update accordingly. |

See `references/bad-data-taxonomy.md` for an extended pattern library and transcript-scanning heuristics.

## Good Question Patterns

These reliably produce signal:

- **"Walk me through the last time [X happened]."** — forces specificity, reveals actual workflow
- **"What did you try? How did that work?"** — surfaces existing solutions and their gaps
- **"How are you dealing with it now?"** — the current workaround is your real competition and pricing anchor
- **"Why do you bother?"** — surfaces real motivation behind stated habits
- **"What are the implications when this happens?"** — separates painkiller problems from vitamin ones
- **"What else have you tried to solve this?"** — if they haven't already tried to solve it, they won't buy your solution
- **"Where does the money come from?"** *(B2B)* — maps the real buyer, budget owner, and approval path
- **"Who else should I talk to?"** — silence here is itself a signal of disinterest
- **"Is there anything I should have asked?"** — surfaces blind spots

When you spot strong emotion, lean in: *"Tell me more — sounds like there's a story." / "Why hasn't this been fixed already?" / "What would happen if you couldn't fix it?"*

See `references/good-questions.md` for the full library, organized by what each unlocks.

## Commitment and Advancement

A meeting without a defined next step was a waste of time, no matter how warm it felt. Push for one of three currencies — escalating in seriousness:

1. **Time** — clear next meeting with an agenda, prototype review, follow-up call, going out of their way to meet
2. **Reputation** — intro to a peer, intro to their boss, public testimonial, social mention
3. **Money** — letter of intent, pre-order, deposit, purchase

**Failed-meeting tells:** "Let me know when you launch." "Send me more info." "Sounds great." (no defined next step)

**Successful tells:** "Can I sign up?" "Let me introduce you to our head of X." "What are the next steps?"

If you don't know what happens next after the meeting, the meeting was pointless. *Decide your desired commitment ask before the meeting starts.*

See `references/commitment-currencies.md` for the full ladder, ask formulas, and failure tells.

## The Terrifying Question

Before any call, write down the **three biggest unknowns** you're actually trying to learn. Not the comfortable ones — the assumptions whose answers could kill your idea. At least one question in your guide should *terrify you to ask*. If none do, you're avoiding the real risk and the call will feel productive without being productive.

Example: if you're building a calendar tool for freelancers, a terrifying question is *not* "would you find this useful?" — it's "of the last 10 times you booked a client meeting, what actually went wrong, and would this have changed it?"

## Discovery vs. Validation Boundary

The Mom Test rules apply most strictly during *discovery* (learning their world). When a call shifts to *validation* (showing a prototype, painting a vision, asking for commitment), the rules adjust:

- **Discovery questions**: never lead with your idea. Anchor to their life and past.
- **Validation questions**: it's OK to show the thing, but don't ask "would you use this?" — observe their reaction, ask what they'd *give up* to have it (time, reputation, money), and create a concrete chance for them to reject you.

Most call guides blend both. Flag where the boundary sits so the interviewer can switch modes consciously, and ensure the validation section ends with an actual ask, not "thoughts?"

## Pre-Call Review Workflow (Mode A)

Given a call guide, agenda, or list of proposed questions:

1. **Identify the three big questions.** Read the guide and infer: what is this conversation actually trying to learn? State the three biggest unknowns back to the user. If you can't find three concrete things, the guide doesn't know what it's testing — flag that first.
2. **Spot the terrifying question.** Is there one? If not, name what it should be given the user's stated goal.
3. **Question-by-question audit.** For each item, classify and explain:
   - ✅ **Gold** — past behavior, anchored to their life, no leading
   - ⚠️ **Risky** — leading, generic, or hypothetical-flavored, but salvageable
   - ❌ **Fluff magnet** — pure hypothetical, asks for opinion on the idea, or invites compliments
4. **Propose replacements.** For every ⚠️ and ❌, write a Mom-Test-compliant version that targets the same underlying learning.
5. **Find the commitment ask.** Where does the guide explicitly invite rejection? If there's no concrete ask (deposit, intro, follow-up with agenda), the meeting will end in fluff. Add one.
6. **Surface elephants in the room.** What's *not* in the guide? Budget? Decision authority? Priority vs. other problems? Have they tried to solve this already? Note the gaps.
7. **Mark the discovery → validation boundary.** Identify where the guide pivots from learning to pitching, and ensure each side follows its own rules.

## Post-Call Analysis Workflow (Mode B)

Given notes, a transcript, or a recounted conversation:

1. **Extract verbatim quotes.** Customer voice, not paraphrase. Bucket each into: gold (specific past behavior, concrete constraint, money/time spent), fluff, compliment, feature request, emotion signal, commitment signal.
2. **Score the conversation.** Did you hear anything that updated your priors, or only things that confirmed them? Confirmation-only ≈ the call probably failed.
3. **Convergence check.** What did this say that previous calls also said? What contradicted? Convergence across unrelated people is the real signal.
4. **Did commitment advance?** Time / reputation / money — what did they actually give up?
5. **Define the next three questions.** Based on what you just learned (or didn't), what's now the most dangerous unknown to test in the next conversation?

See `references/bad-data-taxonomy.md` for transcript-scanning heuristics.

## Anti-Patterns to Flag

- **Pitching mid-discovery** instead of listening
- **Seeking validation** rather than disconfirmation
- **Customer segment too broad** to produce convergent signal (e.g., "developers" is not a segment)
- **Formal "interview" framing** ("Thanks for agreeing to this interview…") that triggers performance behavior — keep it casual
- **Obeying feature requests** instead of diagnosing the underlying problem
- **Confirmation bias**: stopping the conversation when you hear what you wanted
- **No commitment ask**: accepting "this is great" as data
- **Confusing complainers with customers** — they want it solved ≠ they'll pay
- **One-person learning bottleneck**: secondhand accounts lose the nuance that drives decisions
- **Stopping too early** with three interviews from a too-broad segment

## Remember

- A "meh" with specifics outranks a "Wow!" without them.
- People stop lying when you ask for money.
- If they haven't already tried to solve it, they won't buy your solution.
- Ideas should be understood, not obeyed. *You own the solution; they own the problem.*
- The goal of a discovery call is anti-sales: get rejected by everyone except people who genuinely care.
- Conversation isn't data until it's anchored to a specific past behavior, a concrete constraint, or an actual commitment.
