---
name: say
description: Speak text aloud via ElevenLabs TTS with expressive audio tags. Use when the user is alone (solo on a call or away from the keyboard) or has asked you to talk back, narrate progress, or read something out loud. Never speak while the user is on a call with other people. Supports v3 inline tags like [laughs] and [whispers], and per-call routing to a specific output device.
argument-hint: "text to speak (supports v3 audio tags)"
allowed-tools: Bash
---

# Say

Speak a line of text aloud.

```bash
~/.dotfiles/ai/skills/say/say.sh "your message here"
```

## Setup

macOS-only — relies on mpv's CoreAudio backend.

Requirements:

- `mpv` (`brew install mpv`)
- `ELEVENLABS_API_KEY` in the environment (the script also sources `~/.zshrc.local` if not set)

Optional environment variables:

- `CLAUDE_SAY_VOICE_ID` — ElevenLabs voice ID. Defaults to Charlie (`cjVigY5qzO86Huf0OWal`).
- `CLAUDE_SAY_MODEL_ID` — Model. Defaults to `eleven_v3` (supports audio tags).
- `CLAUDE_SAY_AUDIO_DEVICE` — CoreAudio device display name to route audio through. Defaults to system default. Useful for routing into a virtual device (e.g., Loopback) so the audio enters a specific app's mic input.

## Voice character

Sidekick / pair, not narrator. First-person, casual, conversational. Like a partner riding shotgun, not a status announcer.

- "I'm pulling up the form" not "Pulling up the form" or "The agent is fetching X"
- "Heads up, that didn't work" not "An error occurred"
- Use contractions, drop "just/so/I'm going to" filler
- If the user is wrong about something, say so directly — don't soften with "you might consider"

## Length and pacing

- One or two sentences per call. Spoken text is slower than read text; don't dump paragraphs.
- Lead with the conclusion. "Tests pass" beats "I finished running the tests and they all passed."
- Don't read code, IDs, or URLs aloud — paraphrase ("the failing test is in user_spec").
- If you're continuing work after speaking, say what's next in five words or fewer.

## v3 prompting (the default model)

Eleven v3 reads punctuation and inline tags as delivery direction. The voice you're using must support the requested emotion — a calm voice won't suddenly shout, a hyped voice won't whisper convincingly. Test combinations rather than guessing.

### Audio tags

Wrap a tag in square brackets immediately before or after the text it modifies. Use sparingly — one or two tags per utterance, not on every clause.

**Voice / emotion:**
- `[laughs]`, `[laughs harder]`, `[wheezing]`, `[starts laughing]`
- `[whispers]`, `[sighs]`, `[exhales]`, `[inhales deeply]`, `[clears throat]`
- `[curious]`, `[excited]`, `[surprised]`, `[skeptical]`, `[sarcastic]`, `[thoughtful]`, `[happy]`, `[sad]`, `[annoyed]`, `[appalled]`, `[mischievously]`, `[crying]`, `[snorts]`

**Sound effects** (use with intent, not for routine narration):
- `[applause]`, `[clapping]`, `[gunshot]`, `[explosion]`, `[swallows]`, `[gulps]`

**Special / experimental** (test before relying):
- `[strong X accent]` (e.g. `[strong French accent]`)
- `[sings]`, `[woo]`

### Punctuation as direction

- `...` (ellipses) — adds a pause with weight
- `WORD` (caps) — emphasis
- `?` and `!` — natural inflection
- `—` (em-dash) — short conversational pause

v3 does **not** support SSML `<break>` tags. Use ellipses or `[pauses]` instead.

### Examples

Good — expressive, sidekick voice:
```
[curious] Wait, the build is failing on a file you didn't touch? [thoughtful] That's CI cache poisoning, probably. I'll bust it.
```

Good — laugh + redirect:
```
[laughs] Oh, that's actually the same bug from last month... I'll just revert that commit.
```

Good — emphasis with caps:
```
The migration ran. All FIVE THOUSAND rows updated cleanly.
```

Bad — too long, too many tags:
```
[curious] So I was looking at the test [sighs] and it turns out [thoughtful] that the assertion [excited] is comparing the wrong values [laughs] which is why...
```

Bad — tag doesn't match voice character (whispering on an upbeat voice):
```
[whispers] Tests passed.
```

## When NOT to use

- **Check participants before speaking.** Only speak when the user is solo on a call (or not on a call at all); if anyone else is present (check first, e.g. `tuple-dev state`), stay in the terminal — speech would interrupt their conversation and can leak into the call audio.
- Long output, lists, tables, code — those belong in the terminal where the user can read and scroll.
- Anything the user might not want audible to others in the room or on a call.
- Routine task-completion noise when the user is at their keyboard and can read it.
- Confirming a question — speech-only confirmations cost mic latency. If you need an answer, ask in chat.
