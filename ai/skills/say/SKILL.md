---
name: say
description: ElevenLabs speech through the local say script. Use when the user asks for spoken output, narration, or an audible update, and when speech can be delivered without exposing content to other call participants.
argument-hint: Text to speak
allowed-tools: Bash
---

# Say

Before speaking, verify that no other participant can hear the output and that
the content is safe to say aloud. When participant state cannot be verified,
respond in text.

Speak one or two conversational sentences through:

```bash
~/.dotfiles/ai/skills/say/say.sh "your message"
```

Lead with the outcome. Paraphrase code, identifiers, and URLs. Use at most one
or two ElevenLabs v3 emotion tags when delivery benefits from them.

Finish when playback succeeds. On failure, report the script's concrete error
in text.
