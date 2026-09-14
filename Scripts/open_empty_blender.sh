#!/bin/zsh

BLENDER_BIN="/Applications/Blender.app/Contents/MacOS/Blender"

if [[ ! -x "$BLENDER_BIN" ]]; then
  print -u2 "Blender executable bulunamadı: $BLENDER_BIN"
  exit 1
fi

BLENDER_USER_ID="$(id -u)"
exec /bin/launchctl asuser "$BLENDER_USER_ID" "$BLENDER_BIN" --factory-startup --disable-autoexec
