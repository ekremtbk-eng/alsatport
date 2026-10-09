import java.util.Properties

plugins {
    id("com.android.application")
}

/**
 * Upload-key signing for release builds. Values come from android/keystore.properties (git-ignored) or from
 * ALSATPORT_UPLOAD_* environment variables in CI. Without them the release bundle is built unsigned.
 */
val uploadSigning: Map<String, String>? = run {
    val props = Properties()
    val file = rootProject.file("keystore.properties")
    if (file.isFile) file.inputStream().use { props.load(it) }
    fun value(key: String, env: String) = props.getProperty(key) ?: System.getenv(env)
    val storeFile = value("storeFile", "ALSATPORT_UPLOAD_STORE_FILE")
    val storePassword = value("storePassword", "ALSATPORT_UPLOAD_STORE_PASSWORD")
    val keyAlias = value("keyAlias", "ALSATPORT_UPLOAD_KEY_ALIAS")
    val keyPassword = value("keyPassword", "ALSATPORT_UPLOAD_KEY_PASSWORD")
    if (storeFile.isNullOrBlank() || storePassword.isNullOrBlank() || keyAlias.isNullOrBlank() || keyPassword.isNullOrBlank()) {
        null
    } else {
        mapOf("storeFile" to storeFile, "storePassword" to storePassword, "keyAlias" to keyAlias, "keyPassword" to keyPassword)
    }
}

android {
    namespace = "com.alsatport.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.alsatport.app"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        if (uploadSigning != null) {
            create("upload") {
                storeFile = file(uploadSigning.getValue("storeFile"))
                storePassword = uploadSigning.getValue("storePassword")
                keyAlias = uploadSigning.getValue("keyAlias")
                keyPassword = uploadSigning.getValue("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = if (uploadSigning != null) signingConfigs.getByName("upload") else null
        }
        debug {
            versionNameSuffix = "-debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        abortOnError = true
        checkReleaseBuilds = true
    }
}

dependencies {
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.7.4")
    testImplementation("junit:junit:4.13.2")
}
