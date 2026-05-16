#!/usr/bin/env bash
set -euo pipefail

# Stream ElevenLabs text-to-speech and play it through mpv (macOS CoreAudio).
# First-audio latency is roughly 600-700ms, bounded by the API's generation
# start time rather than the total length of the utterance.
#
# Required: ELEVENLABS_API_KEY in the environment (or in ~/.zshrc.local).
# Optional env:
#   CLAUDE_SAY_VOICE_ID      ElevenLabs voice ID (defaults to Charlie)
#   CLAUDE_SAY_MODEL_ID      ElevenLabs model    (defaults to eleven_v3)
#   CLAUDE_SAY_AUDIO_DEVICE  CoreAudio device display name to route through
#                            (defaults to system default output)

VOICE_ID="${CLAUDE_SAY_VOICE_ID:-cjVigY5qzO86Huf0OWal}"
MODEL_ID="${CLAUDE_SAY_MODEL_ID:-eleven_v3}"
CACHE_DIR="/tmp/claude-say"
DEVICE_CACHE="$CACHE_DIR/audio-device-id"

if [[ -z "${ELEVENLABS_API_KEY:-}" ]] && [[ -f "$HOME/.zshrc.local" ]]; then
  # shellcheck disable=SC1091
  source "$HOME/.zshrc.local"
fi

if [[ -z "${ELEVENLABS_API_KEY:-}" ]]; then
  echo "ELEVENLABS_API_KEY not set" >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "usage: $0 \"text to speak\"" >&2
  exit 1
fi

TEXT="$*"
AUDIO_DEVICE_NAME="${CLAUDE_SAY_AUDIO_DEVICE:-}"

# Resolve the CoreAudio UID for a named device and cache it. mpv reports
# devices like 'coreaudio/<uid>' (Display Name); the lookup costs 100-300ms
# per invocation if we redo it every time.
MPV_ARGS=(--no-video --really-quiet -)
if [[ -n "$AUDIO_DEVICE_NAME" ]]; then
  mkdir -p "$CACHE_DIR"
  AUDIO_DEVICE_ID=""
  if [[ -f "$DEVICE_CACHE" ]]; then
    CACHED_NAME=$(sed -n '1p' "$DEVICE_CACHE")
    if [[ "$CACHED_NAME" == "$AUDIO_DEVICE_NAME" ]]; then
      AUDIO_DEVICE_ID=$(sed -n '2p' "$DEVICE_CACHE")
    fi
  fi

  if [[ -z "$AUDIO_DEVICE_ID" ]]; then
    AUDIO_DEVICE_ID=$(mpv --audio-device=help 2>/dev/null \
      | grep -F "($AUDIO_DEVICE_NAME)" \
      | grep "coreaudio/" \
      | sed -E "s/.*'(coreaudio\/[^']+)'.*/\1/" \
      | head -n 1)
    if [[ -z "$AUDIO_DEVICE_ID" ]]; then
      echo "Audio device '$AUDIO_DEVICE_NAME' not found" >&2
      exit 1
    fi
    printf '%s\n%s\n' "$AUDIO_DEVICE_NAME" "$AUDIO_DEVICE_ID" > "$DEVICE_CACHE"
  fi
  MPV_ARGS=(--audio-device="$AUDIO_DEVICE_ID" "${MPV_ARGS[@]}")
fi

export MODEL_ID
BODY=$(/usr/bin/python3 -c 'import json,sys,os; print(json.dumps({"text": sys.argv[1], "model_id": os.environ["MODEL_ID"]}))' "$TEXT")

# Stream from /stream and pipe directly into mpv. First audio arrives as
# soon as ElevenLabs starts generating, instead of waiting for the full MP3
# to download. mp3_22050_32 is plenty for speech and roughly 4x faster to
# transfer than the default mp3_44100_128.
curl -sSN --fail \
  -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?output_format=mp3_22050_32" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
  -H "Content-Type: application/json" \
  -H "Accept: audio/mpeg" \
  -d "$BODY" \
  | mpv "${MPV_ARGS[@]}"
