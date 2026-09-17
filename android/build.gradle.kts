/*
 * File:    build.gradle.kts
 * Module:  Android build
 * Owner:   Ravindu
 * Purpose: Top-level build file. The Android plugin is declared here once
 *          and applied in the app module.
 * Source:  AND-01 (Android Studio project structure and Gradle set-up).
 */
plugins {
    alias(libs.plugins.android.application) apply false
}
