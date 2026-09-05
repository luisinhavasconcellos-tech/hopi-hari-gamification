#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Giralata — build do APK SEM o Android SDK.
#
# Todas as ferramentas vêm do Maven Central (não precisa de dl.google.com):
#   • aapt2 + android-framework.jar ....... org.apktool:apktool-lib
#   • android.jar (classpath de compilação) org.robolectric:android-all
#   • dx (class → dex) .................... com.jakewharton.android.repackaged:dalvik-dx
#   • assinatura v2 + zipalign ........... com.android.tools.build:apksig
# Requisitos locais: JDK 17+, curl, unzip, zip, sha256sum.
#
# uso:  bash android/build-apk.sh            (espera app/src/main/assets/www já gerado
#                                             por `npm run build:android`)
#       npm run apk                          (gera o bundle web e chama este script)
# saída: android/dist/giralata-debug.apk
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$ROOT/app/src/main"
TC="${GIRALATA_TOOLCHAIN:-$ROOT/.toolchain}"
BUILD="$ROOT/build/manual"
DIST="$ROOT/dist"
MAVEN="${MAVEN_MIRROR:-https://repo1.maven.org/maven2}"

PACKAGE="com.hopiplay.giralata"
VERSION_CODE="${VERSION_CODE:-1}"
VERSION_NAME="${VERSION_NAME:-1.0.0}"
MIN_SDK=26
TARGET_SDK=35

APKTOOL_VER=3.0.3
APKSIG_VER=2.3.0
DX_VER=16.0.1
ANDROID_ALL_VER=15-robolectric-13954326

log() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }

mkdir -p "$TC" "$BUILD" "$DIST"

fetch() { # url dest
  if [ ! -s "$2" ]; then
    log "download $(basename "$2")"
    curl -fsSL --retry 4 --retry-delay 2 -o "$2.part" "$1"
    mv "$2.part" "$2"
  fi
}

# ------------------------------------------------------------------ toolchain
fetch "$MAVEN/org/apktool/apktool-lib/$APKTOOL_VER/apktool-lib-$APKTOOL_VER.jar" "$TC/apktool-lib.jar"
fetch "$MAVEN/com/android/tools/build/apksig/$APKSIG_VER/apksig-$APKSIG_VER.jar" "$TC/apksig.jar"
fetch "$MAVEN/com/jakewharton/android/repackaged/dalvik-dx/$DX_VER/dalvik-dx-$DX_VER.jar" "$TC/dx.jar"
fetch "$MAVEN/org/robolectric/android-all/$ANDROID_ALL_VER/android-all-$ANDROID_ALL_VER.jar" "$TC/android-all.jar"

if [ ! -x "$TC/aapt2" ]; then
  log "extract aapt2 + android-framework.jar (apktool)"
  case "$(uname -s)" in
    Darwin) AAPT_ENTRY=prebuilt/macosx/aapt2 ;;
    *) AAPT_ENTRY=prebuilt/linux/aapt2 ;;
  esac
  unzip -o -q "$TC/apktool-lib.jar" "$AAPT_ENTRY" prebuilt/android-framework.jar -d "$TC/apktool"
  cp "$TC/apktool/$AAPT_ENTRY" "$TC/aapt2"
  cp "$TC/apktool/prebuilt/android-framework.jar" "$TC/android-framework.jar"
  chmod +x "$TC/aapt2"
fi

if [ ! -f "$TC/debug.keystore" ]; then
  log "generate debug keystore"
  keytool -genkeypair -keystore "$TC/debug.keystore" -storetype PKCS12 \
    -alias androiddebugkey -storepass android -keypass android \
    -dname "CN=Android Debug,O=Android,C=US" -keyalg RSA -keysize 2048 -validity 10000
fi

if [ ! -f "$TC/ApkSign.class" ]; then
  log "compile ApkSign helper"
  javac -d "$TC" -cp "$TC/apksig.jar" "$ROOT/tools/ApkSign.java"
fi

# ------------------------------------------------------------------ checks
if [ ! -f "$APP/assets/www/index.html" ]; then
  echo "✗ bundle web em falta: corra 'npm run build:android' na raiz do repositório" >&2
  exit 1
fi

rm -rf "$BUILD"
mkdir -p "$BUILD/classes" "$BUILD/res"

# ------------------------------------------------------------------ 1. java → class
log "javac (classpath: android-all $ANDROID_ALL_VER)"
javac --release 8 -Xlint:-options -nowarn -d "$BUILD/classes" \
  -cp "$TC/android-all.jar" \
  $(find "$APP/java" -name '*.java')

# ------------------------------------------------------------------ 2. class → dex
log "dx --dex (minSdk $MIN_SDK)"
java -cp "$TC/dx.jar" com.android.dx.command.Main --dex --min-sdk-version=$MIN_SDK \
  --output="$BUILD/classes.dex" "$BUILD/classes"

# ------------------------------------------------------------------ 3. resources
log "aapt2 compile"
"$TC/aapt2" compile --dir "$APP/res" -o "$BUILD/res/compiled.zip"

# o manifesto fonte não tem `package=` (AGP 8 usa `namespace`); injeta-se aqui
sed "s|<manifest |<manifest package=\"$PACKAGE\" android:versionCode=\"$VERSION_CODE\" android:versionName=\"$VERSION_NAME\" |" \
  "$APP/AndroidManifest.xml" > "$BUILD/AndroidManifest.xml"

log "aapt2 link"
"$TC/aapt2" link -o "$BUILD/unsigned.apk" \
  -I "$TC/android-framework.jar" \
  --manifest "$BUILD/AndroidManifest.xml" \
  --min-sdk-version $MIN_SDK --target-sdk-version $TARGET_SDK \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  -A "$APP/assets" \
  --auto-add-overlay \
  "$BUILD/res/compiled.zip"

# ------------------------------------------------------------------ 4. dex → apk
log "add classes.dex"
( cd "$BUILD" && zip -q -X unsigned.apk classes.dex )

# ------------------------------------------------------------------ 5. sign + align + verify
log "sign v2 (apksig $APKSIG_VER)"
OUT="$DIST/giralata-debug.apk"
java --add-exports java.base/sun.security.x509=ALL-UNNAMED --add-exports java.base/sun.security.pkcs=ALL-UNNAMED \
  -cp "$TC/apksig.jar:$TC" ApkSign "$BUILD/unsigned.apk" "$OUT" "$TC/debug.keystore" android androiddebugkey $MIN_SDK

# ------------------------------------------------------------------ 6. report
log "badging"
"$TC/aapt2" dump badging "$OUT" | grep -E "^(package|sdkVersion|targetSdkVersion|application-label|launchable-activity|uses-feature)" || true
log "sha256"
sha256sum "$OUT" | tee "$OUT.sha256"
log "APK pronto: $OUT ($(du -h "$OUT" | cut -f1))"
