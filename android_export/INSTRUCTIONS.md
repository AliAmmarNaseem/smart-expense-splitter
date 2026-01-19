# Android Project Setup Instructions

I have generated the source code for your native Android application. Follow these steps to set it up in Android Studio.

## 1. Create a New Project
1. Open **Android Studio**.
2. Click **New Project**.
3. Select **Empty Activity** (make sure it's the Jetpack Compose one).
4. Name: `SmartExpenseSplitter`
5. Package name: `com.example.smartsplitter`
6. Language: **Kotlin**
7. Build configuration language: **Kotlin DSL (build.gradle.kts)**

## 2. Add Dependencies
Open `app/build.gradle.kts` and add the following dependencies in the `dependencies` block:

```kotlin
val room_version = "2.6.1"
val lifecycle_version = "2.6.2"

implementation("androidx.room:room-runtime:$room_version")
implementation("androidx.room:room-ktx:$room_version")
ksp("androidx.room:room-compiler:$room_version") // You might need to add the KSP plugin to plugins block first

implementation("androidx.lifecycle:lifecycle-viewmodel-compose:$lifecycle_version")
implementation("androidx.lifecycle:lifecycle-runtime-compose:$lifecycle_version")
implementation("com.google.code.gson:gson:2.10.1")
```

**Note:** To use KSP, add `id("com.google.devtools.ksp") version "1.9.0-1.0.13"` (check compatible version) to your project-level `build.gradle.kts` and app-level `plugins` block. If KSP is too complex, you can use `kapt` instead by adding `id("kotlin-kapt")` to plugins and changing `ksp` to `kapt` above.

## 3. Copy Source Files
Copy the generated files from the `android_export` folder to your Android project's `app/src/main/java/com/example/smartsplitter` directory.

**Structure:**
```
com.example.smartsplitter
├── MainActivity.kt
├── data
│   ├── AppDatabase.kt
│   ├── Converters.kt
│   ├── Daos.kt
│   └── Entities.kt
├── domain
│   ├── CalculationUtils.kt
│   └── ExpenseViewModel.kt
└── ui
    ├── Components.kt
    ├── Dialogs.kt
    └── MainScreen.kt
```

## 4. Run the App
Sync Gradle and run the app on an emulator or device. You should see the fully functional Expense Splitter app!
