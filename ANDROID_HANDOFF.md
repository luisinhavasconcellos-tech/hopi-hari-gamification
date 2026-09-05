# Giralata — Entrega Android

Registo técnico do APK de **Giralata — Tampinhas em Órbita**.

## Artefacto

| Campo | Valor |
|---|---|
| Ficheiro | `android/dist/giralata-debug.apk` |
| Package ID | `com.hopiplay.giralata` |
| versionCode / versionName | 1 / 1.0.0 |
| minSdk / targetSdk | 26 (Android 8.0) / 35 (Android 15) |
| Orientação | paisagem (`sensorLandscape`) |
| Assinatura | depuração, esquema v2 (apksig 2.3.0; v1 desativado — o assinador v1 dessa versão usa APIs internas removidas do JDK 21, e v2 é suficiente para minSdk 26) |
| Ícone | adaptativo (vector drawable com o emblema Giralata) |
| Conteúdo | `MainActivity` (WebView) + bundle web em `assets/www` |
| Experiência padrão | Giralata (`VITE_DEFAULT_GAME=giralata` via `.env.android`) |
| SHA-256 | `7ac4316b809866b00b0e8548c2430ad00712de4bf59c2329a1915f1dbf56f5e5` (também em `android/dist/giralata-debug.apk.sha256`) |

## Como foi construído

O ambiente de build não tinha Android SDK e o host `dl.google.com` estava
bloqueado, por isso o APK foi gerado por `android/build-apk.sh`, que usa apenas
artefactos do Maven Central:

| Passo | Ferramenta | Origem |
|---|---|---|
| `javac --release 8` | JDK 21 | classpath `org.robolectric:android-all:15-robolectric-13954326` |
| `.class → classes.dex` | `dx` | `com.jakewharton.android.repackaged:dalvik-dx:16.0.1` |
| `aapt2 compile/link` | aapt2 2.20 + `android-framework.jar` | `org.apktool:apktool-lib:3.0.3` |
| assinatura + alinhamento | `apksig` (mesma biblioteca do `apksigner`) | `com.android.tools.build:apksig:2.3.0` |

O manifesto fonte (`android/app/src/main/AndroidManifest.xml`) não tem `package=`
para ser compatível com AGP 8 (`namespace`); o script injeta-o antes do `aapt2 link`.

O projeto Gradle (`android/`, AGP 8.7.3, wrapper Gradle 8.9) produz o mesmo app
com `./gradlew :app:assembleDebug` em qualquer máquina com Android Studio. Não foi
possível executá-lo aqui (sem acesso ao repositório Maven da Google).

## Validação feita

| Verificação | Resultado |
|---|---|
| `tsc` (strict) | sem erros |
| `vitest` | 8 testes aprovados (mira/potência, cruzamento swept de porto, reflexão, lata-bumper, teto de Rodopio, pontos ≠ HopiCoins, 6/6 congela + Istampi idempotente) |
| `vite build` / `vite build --mode android` | concluídos |
| Chromium headless (SwiftShader) 1280×720 e 375×812 | intro, `?demo=giralata`, `?demo=giralata-complete`, mira com mouse, lançamento, pausa (P), ajuda, mira por teclado (Enter/setas) — 0 erros de consola |
| Jogador automático sobre a física real | 6/6 entregas com ~37 s restantes em 9 lançamentos |
| `apksig` `ApkVerifier` | `verified=true v2=true` |
| `aapt2 dump badging` | package, sdkVersion 26, targetSdkVersion 35, `launchable-activity com.hopiplay.giralata.MainActivity` |

## O que ainda precisa de um Android real

A sandbox não tem emulador, aparelho ligado nem KVM. Ficaram por validar num
aparelho físico: primeira abertura nativa, desempenho WebGL do WebView, gestos de
toque e o botão "voltar" (`window.giralataBack` → pausa / intro / sair).

```bash
adb install -r android/dist/giralata-debug.apk
adb shell am start -n com.hopiplay.giralata/.MainActivity
```

## Regenerar

```bash
npm install
npm run apk        # bundle web em modo android + build-apk.sh
```
