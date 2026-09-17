/*
 * File:    settings.gradle.kts
 * Module:  Android build
 * Owner:   Ravindu
 * Purpose: Names the Android project, lists its modules and the repositories
 *          that Gradle downloads plugins and libraries from.
 * Source:  AND-01 (Android Studio project structure and Gradle set-up).
 */
pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "SolarGrid"
include(":app")
