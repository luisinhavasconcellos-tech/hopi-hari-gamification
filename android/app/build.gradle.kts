plugins {
    id("com.android.application")
}

android {
    namespace = "com.hopiplay.giralata"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.hopiplay.giralata"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = false
            // assinatura de depuração também no release: entrega de protótipo
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    // o bundle web é gerado por `npm run build:android` na raiz do repositório
    sourceSets {
        getByName("main") {
            assets.srcDirs("src/main/assets")
        }
    }
}
