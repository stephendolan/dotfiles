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
#                            (defaults to system default output). When this
#                            device is not the current default output (e.g. a
#                            Loopback virtual device feeding a call's mic),
#                            audio also plays through the default output so
#                            it is always audible locally.
#   CLAUDE_SAY_NO_MONITOR    Set to 1 to suppress the local monitor playback

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
MONITOR=0
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
      | head -n 1 || true)
    if [[ -z "$AUDIO_DEVICE_ID" ]]; then
      # Configured device is unavailable (e.g. Loopback not running). Fall
      # back to the system default output rather than failing silently-mute.
      echo "Audio device '$AUDIO_DEVICE_NAME' not found; using default output" >&2
      AUDIO_DEVICE_NAME=""
    else
      printf '%s\n%s\n' "$AUDIO_DEVICE_NAME" "$AUDIO_DEVICE_ID" > "$DEVICE_CACHE"
    fi
  fi
fi

if [[ -n "$AUDIO_DEVICE_NAME" ]]; then
  MPV_ARGS=(--audio-device="$AUDIO_DEVICE_ID" "${MPV_ARGS[@]}")

  # If the routed device is not the current default output (e.g. a Loopback
  # virtual device that the user cannot hear), monitor on the default output
  # too so speech is always audible locally.
  if [[ "${CLAUDE_SAY_NO_MONITOR:-0}" != "1" ]]; then
    DEFAULT_OUTPUT_NAME=""
    DEFAULT_OUTPUT_NAME=$(system_profiler -json SPAudioDataType 2>/dev/null \
      | /usr/bin/python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
for item in data.get("SPAudioDataType", []):
    for dev in item.get("_items", []):
        if dev.get("coreaudio_default_audio_output_device") == "spaudio_yes":
            print(dev.get("_name", ""))
            sys.exit(0)
' || true)
    if [[ -n "$DEFAULT_OUTPUT_NAME" && "$DEFAULT_OUTPUT_NAME" != "$AUDIO_DEVICE_NAME" ]]; then
      MONITOR=1
    fi
  fi
fi

export MODEL_ID
BODY=$(/usr/bin/python3 -c 'import json,sys,os; print(json.dumps({"text": sys.argv[1], "model_id": os.environ["MODEL_ID"]}))' "$TEXT")

# Stream from /stream and pipe directly into mpv. First audio arrives as
# soon as ElevenLabs starts generating, instead of waiting for the full MP3
# to download. mp3_22050_32 is plenty for speech and roughly 4x faster to
# transfer than the default mp3_44100_128.
stream_tts() {
  curl -sSN --fail \
    -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?output_format=mp3_22050_32" \
    -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
    -H "Content-Type: application/json" \
    -H "Accept: audio/mpeg" \
    -d "$BODY"
}

if [[ "$MONITOR" == "1" ]]; then
  # Tee the stream so the routed device (e.g. a Loopback feeding a call) and
  # the current default output both play it in near-sync.
  stream_tts | tee >(mpv "${MPV_ARGS[@]}") | mpv --no-video --really-quiet -
else
  stream_tts | mpv "${MPV_ARGS[@]}"
fi
