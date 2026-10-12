#!/usr/bin/env bash
set -euo pipefail

# Install the newest stable BrowserOS neo AppImage once its download matches
# the SHA-256 digest GitHub publishes, then restart neo if it is running.

repo="browseros-ai/BrowserOS"
appimage="${BROWSEROS_NEO_APPIMAGE:-$HOME/Applications/browseros-neo.AppImage}"
service="${BROWSEROS_NEO_SERVICE:-browseros-neo.service}"
curl_opts=(-fsSL --retry 5 --retry-delay 15 --retry-all-errors)

# The repo publishes many component releases between neo releases, so page
# until the newest stable neo release appears.
release=""
for page in 1 2 3 4 5; do
  releases=$(curl "${curl_opts[@]}" -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$repo/releases?per_page=100&page=$page")
  release=$(jq -c 'first(.[] | select((.tag_name | startswith("browserclaw/v")) and (.draft | not) and (.prerelease | not)))' <<<"$releases")
  if [[ -n "$release" || "$(jq length <<<"$releases")" -eq 0 ]]; then
    break
  fi
done

if [[ -z "$release" ]]; then
  echo "No BrowserOS neo release found in $repo" >&2
  exit 1
fi

version=$(jq -r '.tag_name | ltrimstr("browserclaw/v")' <<<"$release")
asset=$(jq -c 'first(.assets[] | select(.name | test("^BrowserOS_neo_v.*_x64\\.AppImage$")))' <<<"$release")
if [[ -z "$asset" ]]; then
  echo "BrowserOS neo $version has no x64 AppImage" >&2
  exit 1
fi

digest=$(jq -r '.digest // ""' <<<"$asset")
if [[ "$digest" != sha256:* ]]; then
  echo "BrowserOS neo $version has no published SHA-256 digest" >&2
  exit 1
fi
expected="${digest#sha256:}"

if [[ -f "$appimage" && "$(sha256sum "$appimage" | cut -d' ' -f1)" == "$expected" ]]; then
  echo "BrowserOS neo $version is current"
  exit 0
fi

mkdir -p "$(dirname "$appimage")"
download="$(dirname "$appimage")/.$(basename "$appimage").download"
trap 'rm -f "$download"' EXIT

curl "${curl_opts[@]}" -o "$download" "$(jq -r '.browser_download_url' <<<"$asset")"
actual=$(sha256sum "$download" | cut -d' ' -f1)
if [[ "$actual" != "$expected" ]]; then
  echo "BrowserOS neo $version failed verification: expected $expected, got $actual" >&2
  exit 1
fi

chmod 755 "$download"
mv -f "$download" "$appimage"
echo "Installed BrowserOS neo $version"

if systemctl --user is-active --quiet "$service"; then
  systemctl --user restart "$service"
  echo "Restarted $service"
fi
