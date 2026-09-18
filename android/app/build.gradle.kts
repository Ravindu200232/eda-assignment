/*
 * File:    build.gradle.kts
 * Module:  Android app
 * Owner:   Ravindu
 * Purpose: Build settings of the app module: SDK levels, the API address and
 *          the Google Maps key (both read from local.properties, which Git
 *          ignores), build features and every library the app uses.
 * Source:  AND-01 (Gradle set-up), AND-03 (keeping the Maps key out of Git).
 */
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
}

// Values that must not be committed live in android/local.properties.
val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) {
        file.inputStream().use { load(it) }
    }
}
val mapsApiKey: String = localProperties.getProperty("MAPS_API_KEY", "")
val apiBaseUrl: String = localProperties.getProperty("API_BASE_URL", "http://10.0.2.2:8080/")

android {
    namespace = "lk.sliit.solargrid"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "lk.sliit.solargrid"
        minSdk = 28
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        manifestPlaceholders["mapsApiKey"] = mapsApiKey
        buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
        // Lets the map screen explain a missing key instead of showing an empty map.
        buildConfigField("boolean", "HAS_MAPS_KEY", mapsApiKey.isNotBlank().toString())
    }

    buildTypes {
        release {
            optimization {
                enable = false
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
        viewBinding = true
    }

    // The stand-in API server and its sample answers are written once and used
    // by both the local tests and the tests that run on the emulator.
    sourceSets {
        getByName("test") { java.srcDir("src/testShared/java") }
        getByName("androidTest") { java.srcDir("src/testShared/java") }
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }

    lint {
        // A real problem must stop the build.
        abortOnError = true
        // These three only say "something newer exists" or "nothing uses this
        // yet". Our versions are pinned on purpose, and the theme pieces and
        // icons belong to screens the team is still building.
        disable += setOf("GradleDependency", "NewerVersionAvailable", "AndroidGradlePluginVersion", "UnusedResources")
        textReport = true
    }
}

dependencies {
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.androidx.recyclerview)
    implementation(libs.androidx.swiperefreshlayout)
    implementation(libs.androidx.lifecycle.viewmodel)
    implementation(libs.androidx.lifecycle.livedata)
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.gson)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.gson)
    implementation(libs.play.services.maps)
    implementation(libs.play.services.location)
    implementation(libs.zxing.android.embedded)
    implementation(libs.zxing.core)

    testImplementation(libs.junit)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.core)
    testImplementation(libs.androidx.test.ext.junit)
    testImplementation(libs.okhttp.mockwebserver)

    androidTestImplementation(libs.androidx.test.core)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.androidx.test.rules)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.espresso.core)
    androidTestImplementation(libs.espresso.contrib)
    androidTestImplementation(libs.espresso.intents)
    androidTestImplementation(libs.uiautomator)
    androidTestImplementation(libs.okhttp.mockwebserver)

    // Lets the screenshot test hand its pictures to the test runner, which
    // copies them off the phone into app/build/outputs.
    androidTestUtil(libs.androidx.test.services)
}
