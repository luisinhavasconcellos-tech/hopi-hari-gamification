# Giralata · Android

Empacotamento Android do minijogo **Giralata — Tampinhas em Órbita** (`/giralata`
da demo HopiPlay). O app é um `WebView` em tela cheia, paisagem, que serve o bundle
web (`app/src/main/assets/www`) a partir da origem interna
`https://giralata.hopiplay.app/`. Não usa rede nem bibliotecas externas.

| Item | Valor |
|---|---|
| Package ID | `com.hopiplay.giralata` |
| minSdk / targetSdk | 26 / 35 |
| Orientação | `sensorLandscape` |
| Assinatura | depuração (keystore gerado localmente) |
| Experiência padrão | `VITE_DEFAULT_GAME=giralata` (via `.env.android`) |

## Caminho A — sem Android SDK (o usado para gerar `dist/giralata-debug.apk`)

```bash
npm install
npm run apk          # = npm run build:android && bash android/build-apk.sh
```

`android/build-apk.sh` descarrega do Maven Central o `aapt2` (apktool-lib), o
`android-all.jar` (Robolectric) como classpath, o `dx` (dalvik-dx) e o `apksig`
para assinar (v2) e alinhar. Só precisa de JDK 17+, `curl`, `unzip`, `zip`.

## Caminho B — Android Studio / Gradle

1. `npm run build:android` na raiz (gera `app/src/main/assets/www`).
2. Abrir a pasta `android/` no Android Studio (AGP 8.7.3, Gradle 8.9+, JDK 17).
3. `./gradlew :app:assembleDebug` → `app/build/outputs/apk/debug/app-debug.apk`.

## Instalar

```bash
adb install -r android/dist/giralata-debug.apk
```

Ver `../ANDROID_HANDOFF.md` para o registo de validação.
