/**
 * Android SDK Integration Generators for DHIS2 MCP Server
 * Provides code generation and configuration for DHIS2 Android app development
 */

export interface AndroidProjectConfig {
  projectName: string;
  applicationId: string;
  minSdkVersion: number;
  targetSdkVersion: number;
  language: 'kotlin' | 'java';
  dhis2SdkVersion: string;
  features: string[];
  architecture: string;
}

export interface GradleConfig {
  dhis2SdkVersion: string;
  buildFeatures: {
    compose?: boolean;
    viewBinding?: boolean;
    dataBinding?: boolean;
  };
  proguardRules: boolean;
  buildVariants: Array<{
    name: string;
    dhis2Instance: string;
  }>;
  additionalLibraries: string[];
}

export function generateAndroidProjectInit(config: AndroidProjectConfig): string {
  const { projectName, applicationId, minSdkVersion = 21, targetSdkVersion = 34, language, dhis2SdkVersion, features = [], architecture } = config;

  return `# DHIS2 Android Project Initialization Guide

## 🚀 Quick Start Commands

\`\`\`bash
# Create new Android project structure
mkdir ${projectName}
cd ${projectName}

# Initialize Android project with Android Studio template or CLI
# Option 1: Android Studio
# - Create new project with API ${minSdkVersion}+ and ${language}
# - Choose Empty Activity template
# - Set Application name: ${projectName}
# - Set Package name: ${applicationId}

# Option 2: Command line with Android CLI tools
android create project \\
    --name ${projectName} \\
    --target android-${targetSdkVersion} \\
    --path ./${projectName} \\
    --package ${applicationId} \\
    --activity MainActivity

# Initialize git repository
git init
\`\`\`

## 📱 Project Structure

\`\`\`
${projectName}/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/${applicationId?.replace(/\./g, '/') || 'com/example/app'}/
│   │   │   │   ├── MainActivity.${language === 'kotlin' ? 'kt' : 'java'}
│   │   │   │   ├── data/
│   │   │   │   │   ├── local/
│   │   │   │   │   ├── remote/
│   │   │   │   │   └── repository/
│   │   │   │   ├── domain/
│   │   │   │   │   ├── model/
│   │   │   │   │   ├── repository/
│   │   │   │   │   └── usecase/
│   │   │   │   ├── presentation/
│   │   │   │   │   ├── ui/
│   │   │   │   │   └── viewmodel/
│   │   │   │   └── utils/
│   │   │   ├── res/
│   │   │   └── AndroidManifest.xml
│   │   ├── androidTest/
│   │   └── test/
│   ├── build.gradle${language === 'kotlin' ? '.kts' : ''}
│   └── proguard-rules.pro
├── gradle/
├── build.gradle${language === 'kotlin' ? '.kts' : ''}
├── gradle.properties
└── settings.gradle${language === 'kotlin' ? '.kts' : ''}
\`\`\`

## 🏗️ Architecture Pattern: ${architecture?.toUpperCase().replace('_', ' ') || 'MVVM'}

${generateArchitecturePattern(architecture || 'mvvm', language || 'kotlin')}

## 📋 Required Permissions

Add these permissions to \`app/src/main/AndroidManifest.xml\`:

\`\`\`xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${applicationId}">

    <!-- DHIS2 SDK Required Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    
${(features || []).includes('gps_capture') ? `    <!-- Location Services -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />` : ''}
${(features || []).includes('camera_integration') ? `    <!-- Camera & Media -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />` : ''}
${(features || []).includes('encrypted_storage') ? `    <!-- Storage & Security -->
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />` : ''}
${(features || []).includes('offline_sync') ? `    <!-- Background Sync -->
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />` : ''}

    <application
        android:name=".${(projectName || 'App').replace(/-/g, '')}Application"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.${(projectName || 'App').replace(/-/g, '')}"
        android:networkSecurityConfig="@xml/network_security_config">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.${(projectName || 'App').replace(/-/g, '')}.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
${(features || []).includes('offline_sync') ? `        <!-- Background Sync Service -->
        <service
            android:name=".service.SyncService"
            android:permission="android.permission.BIND_JOB_SERVICE"
            android:exported="false" />` : ''}
    </application>
</manifest>
\`\`\`

## 🔧 Next Steps

1. **Configure Gradle**: Use \`dhis2_android_configure_gradle\` tool
2. **Set up Authentication**: Use \`dhis2_android_setup_authentication\` tool  
3. **Configure Data Sync**: Use \`dhis2_android_setup_sync\` tool
4. **Add UI Components**: Use \`dhis2_android_configure_ui_patterns\` tool

## 📚 Additional Resources

- [DHIS2 Android SDK Documentation](https://docs.dhis2.org/en/develop/developing-with-the-android-sdk/about-this-guide.html)
- [Android Architecture Guide](https://developer.android.com/guide/components/activities/activity-lifecycle)
- [Material Design Components](https://material.io/develop/android)

## 🧪 Development Commands

\`\`\`bash
# Build debug APK
./gradlew assembleDebug

# Run tests
./gradlew test

# Install on connected device
./gradlew installDebug

# Generate signed APK
./gradlew assembleRelease
\`\`\`
`;
}

function generateArchitecturePattern(architecture: string, language: 'kotlin' | 'java'): string {
  switch (architecture) {
    case 'mvvm':
      return generateMVVMPattern(language);
    case 'mvi':
      return generateMVIPattern(language);
    case 'clean_architecture':
      return generateCleanArchitecturePattern(language);
    default:
      return generateMVVMPattern(language);
  }
}

function generateMVVMPattern(language: 'kotlin' | 'java'): string {
  const extension = language === 'kotlin' ? 'kt' : 'java';
  const example = language === 'kotlin' ? `
\`\`\`kotlin
// ViewModel Example
class MainViewModel(
    private val dhis2Repository: DHIS2Repository
) : ViewModel() {
    
    private val _uiState = MutableLiveData<UiState>()
    val uiState: LiveData<UiState> = _uiState
    
    fun syncData() {
        viewModelScope.launch {
            try {
                _uiState.value = UiState.Loading
                dhis2Repository.syncMetadata()
                _uiState.value = UiState.Success
            } catch (e: Exception) {
                _uiState.value = UiState.Error(e.message)
            }
        }
    }
}

// Repository Example  
interface DHIS2Repository {
    suspend fun syncMetadata()
    suspend fun getDataElements(): List<DataElement>
}
\`\`\`` : `
\`\`\`java
// ViewModel Example
public class MainViewModel extends ViewModel {
    
    private final DHIS2Repository repository;
    private final MutableLiveData<UiState> uiState = new MutableLiveData<>();
    
    public MainViewModel(DHIS2Repository repository) {
        this.repository = repository;
    }
    
    public LiveData<UiState> getUiState() {
        return uiState;
    }
    
    public void syncData() {
        // Implementation with RxJava or Executor
    }
}
\`\`\``;

  return `
**Model-View-ViewModel (MVVM)** pattern provides clear separation of concerns:

- **Model**: Data layer (DHIS2 SDK, Room database)  
- **View**: UI layer (Activities, Fragments, Compose)
- **ViewModel**: Business logic and state management

### Key Components:
- \`data/\` - Data sources and repositories
- \`presentation/viewmodel/\` - ViewModels with LiveData/StateFlow
- \`presentation/ui/\` - UI components
${example}

### Benefits:
- Testable business logic
- Reactive UI updates  
- Lifecycle-aware components
- Clean separation of concerns
`;
}

function generateMVIPattern(language: 'kotlin' | 'java'): string {
  return `
**Model-View-Intent (MVI)** pattern provides unidirectional data flow:

- **Model**: Represents the state of the app
- **View**: Displays the state and emits intents
- **Intent**: User actions that trigger state changes

### Key Components:
- Immutable state objects
- Sealed classes for intents/actions
- State reducers
- Single source of truth

### Benefits:
- Predictable state management
- Time-travel debugging
- Easy testing
- Unidirectional data flow
`;
}

function generateCleanArchitecturePattern(language: 'kotlin' | 'java'): string {
  return `
**Clean Architecture** provides maximum separation and testability:

### Layers:
1. **Presentation** - UI components, ViewModels
2. **Domain** - Business logic, Use Cases, Entity models  
3. **Data** - Repositories, Data sources, API/DB access

### Dependency Rule:
- Inner layers don't depend on outer layers
- Use dependency inversion principle
- Abstract interfaces between layers

### Benefits:
- Framework independent
- Highly testable
- UI independent
- Database independent
`;
}

export function generateGradleBuildConfig(config: GradleConfig): string {
  const { dhis2SdkVersion, buildFeatures, proguardRules, buildVariants, additionalLibraries } = config;

  const additionalDependencies = additionalLibraries.map(lib => {
    switch (lib) {
      case 'room':
        return `    // Room Database
    implementation "androidx.room:room-runtime:2.6.1"
    implementation "androidx.room:room-ktx:2.6.1"
    kapt "androidx.room:room-compiler:2.6.1"`;
      case 'retrofit':
        return `    // Retrofit HTTP Client  
    implementation "com.squareup.retrofit2:retrofit:2.9.0"
    implementation "com.squareup.retrofit2:converter-gson:2.9.0"`;
      case 'dagger_hilt':
        return `    // Dagger Hilt
    implementation "com.google.dagger:hilt-android:2.48"
    kapt "com.google.dagger:hilt-compiler:2.48"`;
      case 'rxjava':
        return `    // RxJava
    implementation "io.reactivex.rxjava3:rxjava:3.1.8"
    implementation "io.reactivex.rxjava3:rxandroid:3.0.2"`;
      case 'coroutines':
        return `    // Kotlin Coroutines
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3"
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3"`;
      case 'navigation':
        return `    // Navigation Component
    implementation "androidx.navigation:navigation-fragment-ktx:2.7.6"
    implementation "androidx.navigation:navigation-ui-ktx:2.7.6"`;
      default:
        return '';
    }
  }).filter(dep => dep).join('\n\n');

  return `# Android Gradle Build Configuration

## app/build.gradle.kts

\`\`\`kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
${buildFeatures.compose ? '    id("org.jetbrains.kotlin.plugin.compose")' : ''}
${additionalLibraries.includes('dagger_hilt') ? '    id("dagger.hilt.android.plugin")' : ''}
    kotlin("kapt")
}

android {
    namespace = "${config.dhis2SdkVersion}"  // Use your package name
    compileSdk = 34

    defaultConfig {
        applicationId = "org.dhis2.android.app"
        minSdk = 21
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
${buildFeatures.compose ? `        
        vectorDrawables {
            useSupportLibrary = true
        }` : ''}
    }

    buildTypes {
        release {
            isMinifyEnabled = ${proguardRules}
            ${proguardRules ? 'proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")' : ''}
        }
        debug {
            isMinifyEnabled = false
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-DEBUG"
        }
    }

    ${buildVariants.length > 0 ? `
    flavorDimensions += "environment"
    productFlavors {${buildVariants.map(variant => `
        create("${variant.name}") {
            dimension = "environment"
            buildConfigField("String", "DHIS2_BASE_URL", "\\"${variant.dhis2Instance}\\"")
            applicationIdSuffix = ".${variant.name}"
        }`).join('')}
    }` : ''}

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    
    kotlinOptions {
        jvmTarget = "1.8"
    }

    buildFeatures {
${buildFeatures.compose ? '        compose = true' : ''}
${buildFeatures.viewBinding ? '        viewBinding = true' : ''}  
${buildFeatures.dataBinding ? '        dataBinding = true' : ''}
        buildConfig = true
    }

${buildFeatures.compose ? `    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }` : ''}

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // DHIS2 Android SDK
    implementation "org.hisp.dhis:android-core:${dhis2SdkVersion}"
    
    // Core Android Dependencies
    implementation "androidx.core:core-ktx:1.12.0"
    implementation "androidx.lifecycle:lifecycle-runtime-ktx:2.7.0"
    implementation "androidx.activity:activity-ktx:1.8.2"
    
${buildFeatures.compose ? `    // Jetpack Compose
    implementation platform("androidx.compose:compose-bom:2024.02.00")
    implementation "androidx.compose.ui:ui"
    implementation "androidx.compose.ui:ui-graphics"
    implementation "androidx.compose.ui:ui-tooling-preview"
    implementation "androidx.compose.material3:material3"
    implementation "androidx.activity:activity-compose:1.8.2"
    
    debugImplementation "androidx.compose.ui:ui-tooling"
    debugImplementation "androidx.compose.ui:ui-test-manifest"` : ''}

${!buildFeatures.compose ? `    // Traditional Android Views
    implementation "com.google.android.material:material:1.11.0"
    implementation "androidx.constraintlayout:constraintlayout:2.1.4"` : ''}

    // Lifecycle Components
    implementation "androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0"
    implementation "androidx.lifecycle:lifecycle-livedata-ktx:2.7.0"

${additionalDependencies}

    // Testing
    testImplementation "junit:junit:4.13.2"
    testImplementation "org.mockito:mockito-core:5.7.0"
    testImplementation "androidx.arch.core:core-testing:2.2.0"
    
    androidTestImplementation "androidx.test.ext:junit:1.1.5"
    androidTestImplementation "androidx.test.espresso:espresso-core:3.5.1"
${buildFeatures.compose ? `    androidTestImplementation "androidx.compose.ui:ui-test-junit4"` : ''}
}
\`\`\`

## Project Level build.gradle.kts

\`\`\`kotlin
plugins {
    id("com.android.application") version "8.2.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
${additionalLibraries.includes('dagger_hilt') ? '    id("com.google.dagger.hilt.android") version "2.48" apply false' : ''}
${buildFeatures.compose ? '    id("org.jetbrains.kotlin.plugin.compose") version "1.9.22" apply false' : ''}
}
\`\`\`

${proguardRules ? generateProGuardRules() : ''}

## gradle.properties

\`\`\`properties
# Android Configuration
android.useAndroidX=true
android.enableJetifier=true

# Kotlin Configuration  
kotlin.code.style=official

# Performance Optimizations
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.configureondemand=true

# DHIS2 Configuration
DHIS2_SDK_VERSION=${dhis2SdkVersion}
\`\`\`

## Next Steps

1. **Sync project** - Click "Sync Now" in Android Studio
2. **Configure authentication** - Use \`dhis2_android_setup_authentication\`  
3. **Set up data models** - Use \`dhis2_android_generate_data_models\`
4. **Configure sync** - Use \`dhis2_android_setup_sync\`
`;
}

function generateProGuardRules(): string {
  return `
## proguard-rules.pro

\`\`\`
# DHIS2 Android SDK ProGuard Rules
-keep class org.hisp.dhis.android.core.** { *; }
-keep class org.hisp.dhis.rules.** { *; }
-dontwarn org.hisp.dhis.**

# Retrofit
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}

# OkHttp
-keepattributes *Annotation*
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**

# Gson
-keepattributes Signature
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Keep model classes (adjust package name)
-keep class com.yourpackage.data.model.** { *; }

# Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**
\`\`\``;
}

export function generateSyncConfiguration(args: any): string {
  const { syncStrategy, syncScope, conflictResolution, networkConditions, progressTracking } = args;

  return `# DHIS2 Android Sync Configuration

## Overview
This configuration sets up ${syncStrategy} synchronization with ${conflictResolution} conflict resolution.

## Sync Manager Setup

\`\`\`kotlin
class SyncManager @Inject constructor(
    private val d2: D2,
    private val networkManager: NetworkManager,
    private val syncPreferences: SyncPreferences
) {
    
    suspend fun performSync(syncType: SyncType = SyncType.FULL): SyncResult {
        return when (syncStrategy) {
            SyncStrategy.MANUAL -> performManualSync(syncType)
            SyncStrategy.AUTOMATIC -> performAutomaticSync()
            SyncStrategy.SCHEDULED -> scheduleSync()
            SyncStrategy.SMART -> performSmartSync()
        }
    }

    private suspend fun performManualSync(syncType: SyncType): SyncResult {
        if (!canSync()) return SyncResult.Failed("Network conditions not met")
        
        return try {
            ${syncScope.metadata ? 'syncMetadata()' : ''}
            ${syncScope.dataValues ? 'syncDataValues()' : ''}  
            ${syncScope.events ? 'syncEvents()' : ''}
            ${syncScope.enrollments ? 'syncEnrollments()' : ''}
            
            SyncResult.Success
        } catch (e: Exception) {
            handleSyncError(e)
        }
    }

    private suspend fun syncMetadata() {
        ${progressTracking ? 'updateProgress("Syncing metadata...", 10)' : ''}
        d2.metadataModule().download().blockingDownload()
    }

    private suspend fun syncDataValues() {  
        ${progressTracking ? 'updateProgress("Syncing data values...", 40)' : ''}
        d2.dataValueModule().dataValueUploader().blockingUpload()
    }

    private suspend fun syncEvents() {
        ${progressTracking ? 'updateProgress("Syncing events...", 70)' : ''}
        d2.trackerModule().trackedEntityInstances().blockingUpload()
        d2.eventModule().events().blockingUpload()
    }

    private suspend fun syncEnrollments() {
        ${progressTracking ? 'updateProgress("Syncing enrollments...", 90)' : ''}
        d2.enrollmentModule().enrollments().blockingUpload()
    }

    private fun canSync(): Boolean {
        ${networkConditions.wifiOnly ? 'if (!networkManager.isWiFiConnected()) return false' : ''}
        if (!networkManager.isConnected()) return false
        return true
    }

    private fun handleConflict(conflict: ImportConflict): ConflictResolution {
        return when (conflictResolution) {
            ConflictResolution.SERVER_WINS -> ConflictResolution.SERVER_WINS
            ConflictResolution.CLIENT_WINS -> ConflictResolution.CLIENT_WINS
            ConflictResolution.MERGE -> mergeConflict(conflict)
            ConflictResolution.USER_PROMPT -> promptUserForResolution(conflict)
        }
    }
}

sealed class SyncResult {
    object Success : SyncResult()
    data class Failed(val error: String) : SyncResult()
    data class PartialSuccess(val details: String) : SyncResult()
}

enum class SyncStrategy {
    MANUAL, AUTOMATIC, SCHEDULED, SMART
}
\`\`\`

## Background Sync Service

\`\`\`kotlin
@HiltWorker  
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val syncManager: SyncManager
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            val result = syncManager.performSync()
            when (result) {
                is SyncResult.Success -> Result.success()
                is SyncResult.Failed -> Result.retry()
                is SyncResult.PartialSuccess -> Result.success()
            }
        } catch (e: Exception) {
            Result.failure()
        }
    }

    @AssistedFactory
    interface Factory {
        fun create(context: Context, params: WorkerParameters): SyncWorker
    }
}

// Schedule periodic sync
class SyncScheduler @Inject constructor(
    private val workManager: WorkManager
) {
    
    fun schedulePeriodicSync() {
        val constraints = Constraints.Builder()
            ${networkConditions.wifiOnly ? '.setRequiredNetworkType(NetworkType.UNMETERED)' : '.setRequiredNetworkType(NetworkType.CONNECTED)'}
            ${networkConditions.backgroundSync ? '' : '.setRequiresBatteryNotLow(true)'}
            .build()

        val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
            repeatInterval = 15, // minutes
            repeatIntervalTimeUnit = TimeUnit.MINUTES
        ).setConstraints(constraints)
         .build()

        workManager.enqueueUniquePeriodicWork(
            "sync_work",
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest
        )
    }
}
\`\`\`

## Network Monitoring

\`\`\`kotlin
@Singleton
class NetworkManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    fun isConnected(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    fun isWiFiConnected(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
    }

    fun getNetworkType(): NetworkType {
        val network = connectivityManager.activeNetwork ?: return NetworkType.NONE
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return NetworkType.NONE
        
        return when {
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> NetworkType.WIFI
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> NetworkType.CELLULAR
            else -> NetworkType.OTHER
        }
    }
}

enum class NetworkType { NONE, WIFI, CELLULAR, OTHER }
\`\`\`

${progressTracking ? generateProgressTracking() : ''}

## Usage Example

\`\`\`kotlin
class MainActivity : AppCompatActivity() {
    
    @Inject lateinit var syncManager: SyncManager
    @Inject lateinit var syncScheduler: SyncScheduler
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Schedule background sync
        syncScheduler.schedulePeriodicSync()
        
        // Manual sync button
        binding.syncButton.setOnClickListener {
            lifecycleScope.launch {
                val result = syncManager.performSync()
                handleSyncResult(result)
            }
        }
    }
    
    private fun handleSyncResult(result: SyncResult) {
        when (result) {
            is SyncResult.Success -> {
                Toast.makeText(this, "Sync completed successfully", Toast.LENGTH_SHORT).show()
            }
            is SyncResult.Failed -> {
                Toast.makeText(this, "Sync failed: \${result.error}", Toast.LENGTH_LONG).show()
            }
            is SyncResult.PartialSuccess -> {
                Toast.makeText(this, "Partial sync: \${result.details}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
\`\`\`

## Configuration Summary

- **Strategy**: ${syncStrategy}
- **Scope**: ${Object.entries(syncScope).filter(([_, enabled]) => enabled).map(([key]) => key).join(', ')}
- **Conflict Resolution**: ${conflictResolution}
- **Network**: ${networkConditions.wifiOnly ? 'WiFi only' : 'Any connection'}${networkConditions.backgroundSync ? ', Background sync enabled' : ''}
- **Progress Tracking**: ${progressTracking ? 'Enabled' : 'Disabled'}
${networkConditions.chunkSize ? `- **Chunk Size**: ${networkConditions.chunkSize}KB` : ''}
`;
}

function generateProgressTracking(): string {
  return `
## Sync Progress Tracking

\`\`\`kotlin
interface SyncProgressListener {
    fun onProgressUpdate(progress: Int, message: String)
    fun onSyncStarted()
    fun onSyncCompleted(result: SyncResult)
}

class SyncProgressManager {
    private val listeners = mutableListOf<SyncProgressListener>()
    
    fun addListener(listener: SyncProgressListener) {
        listeners.add(listener)
    }
    
    fun removeListener(listener: SyncProgressListener) {
        listeners.remove(listener)
    }
    
    fun updateProgress(progress: Int, message: String) {
        listeners.forEach { it.onProgressUpdate(progress, message) }
    }
    
    fun notifyStarted() {
        listeners.forEach { it.onSyncStarted() }
    }
    
    fun notifyCompleted(result: SyncResult) {
        listeners.forEach { it.onSyncCompleted(result) }
    }
}

// Usage in UI
class SyncProgressFragment : Fragment(), SyncProgressListener {
    
    override fun onProgressUpdate(progress: Int, message: String) {
        binding.progressBar.progress = progress
        binding.progressText.text = message
    }
    
    override fun onSyncStarted() {
        binding.progressContainer.visibility = View.VISIBLE
        binding.syncButton.isEnabled = false
    }
    
    override fun onSyncCompleted(result: SyncResult) {
        binding.progressContainer.visibility = View.GONE
        binding.syncButton.isEnabled = true
    }
}
\`\`\``;
}

export function generateLocationServicesConfig(args: any): string {
  const { locationAccuracy, permissions, geofencing, coordinateCapture, offlineMapping } = args;

  return `# DHIS2 Android Location Services Configuration

## Location Accuracy: ${locationAccuracy.toUpperCase()}

${generateLocationServiceImplementation(locationAccuracy, permissions, geofencing, coordinateCapture, offlineMapping)}

## AndroidManifest.xml Permissions

\`\`\`xml
${permissions.fineLocation ? '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />' : ''}
${permissions.coarseLocation ? '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />' : ''}
${permissions.backgroundLocation ? '<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />' : ''}
${offlineMapping ? '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />' : ''}

<!-- Location hardware features -->
<uses-feature 
    android:name="android.hardware.location"
    android:required="false" />
<uses-feature 
    android:name="android.hardware.location.gps"
    android:required="false" />
\`\`\`

## Implementation

${generateLocationManagerCode(locationAccuracy, geofencing, coordinateCapture, permissions)}

${geofencing.enabled ? generateGeofencingCode(geofencing) : ''}

${offlineMapping ? generateOfflineMappingCode() : ''}

## Usage Examples

\`\`\`kotlin
class DataEntryActivity : AppCompatActivity() {
    
    @Inject lateinit var locationManager: DHIS2LocationManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Request location permissions
        locationManager.requestPermissions(this)
        
        // Capture coordinates for data entry
        binding.captureLocationButton.setOnClickListener {
            captureCurrentLocation()
        }
    }
    
    private fun captureCurrentLocation() {
        lifecycleScope.launch {
            try {
                val location = locationManager.getCurrentLocation()
                // Update data element with coordinates
                updateCoordinateDataElement(location)
            } catch (e: Exception) {
                showLocationError(e.message)
            }
        }
    }
    
    private fun updateCoordinateDataElement(location: Location) {
        val coordinates = "\${location.latitude},\${location.longitude}"
        // Update DHIS2 data value with coordinates
        d2.dataValueModule().dataValues()
            .value(dataElementId, orgUnitId, periodId, categoryOptionComboId)
            .set(coordinates)
    }
}
\`\`\`

## Testing Location Services

\`\`\`kotlin
@Test
fun testLocationCapture() {
    // Mock location for testing
    val mockLocation = Location("test").apply {
        latitude = -1.2921
        longitude = 36.8219
        accuracy = 5.0f
    }
    
    val result = locationValidator.validateLocation(mockLocation)
    assertTrue(result.isValid)
}
\`\`\`
`;
}

function generateLocationServiceImplementation(accuracy: string, permissions: any, geofencing: any, capture: any, offlineMapping: boolean): string {
  return `
Location services configured with **${accuracy}** accuracy priority.

### Features Enabled:
- **Fine Location**: ${permissions.fineLocation ? '✅' : '❌'}
- **Coarse Location**: ${permissions.coarseLocation ? '✅' : '❌'}  
- **Background Location**: ${permissions.backgroundLocation ? '✅' : '❌'}
- **Geofencing**: ${geofencing.enabled ? '✅' : '❌'}
- **Coordinate Validation**: ${capture.validation ? '✅' : '❌'}
- **Offline Mapping**: ${offlineMapping ? '✅' : '❌'}

### Coordinate Capture Settings:
${capture.validation ? `- **Accuracy Threshold**: ${capture.accuracyThreshold}m` : ''}
${capture.timeoutSeconds ? `- **Timeout**: ${capture.timeoutSeconds}s` : ''}

${geofencing.enabled ? `### Geofencing Settings:
- **Default Radius**: ${geofencing.radius}m
- **Triggers**: ${geofencing.triggers.join(', ')}` : ''}
`;
}

function generateLocationManagerCode(accuracy: string, geofencing: any, capture: any, permissions: any): string {
  return `
\`\`\`kotlin
@Singleton
class DHIS2LocationManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
    private val locationRequest = createLocationRequest()

    private fun createLocationRequest(): LocationRequest {
        return LocationRequest.Builder(
            Priority.${getLocationPriority(accuracy)},
            ${capture.timeoutSeconds ? capture.timeoutSeconds * 1000 : 10000}L // ${capture.timeoutSeconds || 10} seconds
        ).apply {
            setWaitForAccurateLocation(${capture.validation || false})
            ${capture.accuracyThreshold ? `setMinUpdateDistanceMeters(${capture.accuracyThreshold}f)` : ''}
        }.build()
    }

    suspend fun getCurrentLocation(): Location {
        return withContext(Dispatchers.IO) {
            suspendCancellableCoroutine { continuation ->
                if (!hasLocationPermission()) {
                    continuation.resumeWithException(SecurityException("Location permission not granted"))
                    return@suspendCancellableCoroutine
                }

                fusedLocationClient.getCurrentLocation(
                    Priority.${getLocationPriority(accuracy)},
                    null
                ).addOnSuccessListener { location ->
                    if (location != null) {
                        ${capture.validation ? 'if (isLocationAccurate(location)) {' : ''}
                        continuation.resume(location)
                        ${capture.validation ? '} else { continuation.resumeWithException(Exception("Location accuracy insufficient")) }' : ''}
                    } else {
                        continuation.resumeWithException(Exception("Unable to get location"))
                    }
                }.addOnFailureListener { exception ->
                    continuation.resumeWithException(exception)
                }
            }
        }
    }

    ${capture.validation ? `
    private fun isLocationAccurate(location: Location): Boolean {
        return location.accuracy <= ${capture.accuracyThreshold || 10}f
    }` : ''}

    fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    fun requestPermissions(activity: Activity) {
        val requestPermissions = mutableListOf<String>()
        ${permissions.fineLocation ? 'requestPermissions.add(Manifest.permission.ACCESS_FINE_LOCATION)' : ''}
        ${permissions.coarseLocation ? 'requestPermissions.add(Manifest.permission.ACCESS_COARSE_LOCATION)' : ''}
        ${permissions.backgroundLocation ? 'requestPermissions.add(Manifest.permission.ACCESS_BACKGROUND_LOCATION)' : ''}

        ActivityCompat.requestPermissions(
            activity,
            requestPermissions.toTypedArray(),
            LOCATION_PERMISSION_REQUEST_CODE
        )
    }

    companion object {
        private const val LOCATION_PERMISSION_REQUEST_CODE = 1001
    }
}
\`\`\``;
}

function getLocationPriority(accuracy: string): string {
  switch (accuracy) {
    case 'high': return 'PRIORITY_HIGH_ACCURACY';
    case 'balanced': return 'PRIORITY_BALANCED_POWER_ACCURACY';
    case 'low_power': return 'PRIORITY_LOW_POWER';
    case 'passive': return 'PRIORITY_PASSIVE';
    default: return 'PRIORITY_BALANCED_POWER_ACCURACY';
  }
}

function generateGeofencingCode(geofencing: any): string {
  return `
## Geofencing Implementation

\`\`\`kotlin
@Singleton
class GeofenceManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    private val geofencingClient = LocationServices.getGeofencingClient(context)
    private val geofencePendingIntent by lazy { createGeofencePendingIntent() }

    fun addGeofence(
        id: String,
        latitude: Double, 
        longitude: Double,
        radius: Float = ${geofencing.radius}f
    ) {
        val geofence = Geofence.Builder()
            .setRequestId(id)
            .setCircularRegion(latitude, longitude, radius)
            .setTransitionTypes(${geofencing.triggers.map((trigger: string) => getGeofenceTransition(trigger)).join(' or ')})
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            .build()

        val geofenceRequest = GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofence(geofence)
            .build()

        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) 
            == PackageManager.PERMISSION_GRANTED) {
            
            geofencingClient.addGeofences(geofenceRequest, geofencePendingIntent)
                .addOnSuccessListener { 
                    Log.d("Geofence", "Added geofence: $id") 
                }
                .addOnFailureListener { exception ->
                    Log.e("Geofence", "Failed to add geofence: $id", exception)
                }
        }
    }

    private fun createGeofencePendingIntent(): PendingIntent {
        val intent = Intent(context, GeofenceBroadcastReceiver::class.java)
        return PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}

class GeofenceBroadcastReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val geofencingEvent = GeofencingEvent.fromIntent(intent)
        if (geofencingEvent?.hasError() == true) {
            Log.e("Geofence", "Geofence error: \${geofencingEvent.errorCode}")
            return
        }

        val geofenceTransition = geofencingEvent?.geofenceTransition
        when (geofenceTransition) {
            ${geofencing.triggers.includes('enter') ? 'Geofence.GEOFENCE_TRANSITION_ENTER -> handleEnterEvent(geofencingEvent)' : ''}
            ${geofencing.triggers.includes('exit') ? 'Geofence.GEOFENCE_TRANSITION_EXIT -> handleExitEvent(geofencingEvent)' : ''}
            ${geofencing.triggers.includes('dwell') ? 'Geofence.GEOFENCE_TRANSITION_DWELL -> handleDwellEvent(geofencingEvent)' : ''}
        }
    }

    private fun handleEnterEvent(event: GeofencingEvent) {
        // Handle facility entry
        event.triggeringGeofences?.forEach { geofence ->
            Log.d("Geofence", "Entered geofence: \${geofence.requestId}")
            // Trigger data entry workflow
        }
    }
}
\`\`\``;
}

function getGeofenceTransition(trigger: string): string {
  switch (trigger) {
    case 'enter': return 'Geofence.GEOFENCE_TRANSITION_ENTER';
    case 'exit': return 'Geofence.GEOFENCE_TRANSITION_EXIT'; 
    case 'dwell': return 'Geofence.GEOFENCE_TRANSITION_DWELL';
    default: return 'Geofence.GEOFENCE_TRANSITION_ENTER';
  }
}

function generateOfflineMappingCode(): string {
  return `
## Offline Mapping Support

\`\`\`kotlin
@Singleton  
class OfflineMapManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    private val mapboxMap by lazy { 
        // Initialize Mapbox or Google Maps SDK
    }

    fun downloadOfflineRegion(
        regionName: String,
        bounds: LatLngBounds,
        minZoom: Double = 10.0,
        maxZoom: Double = 16.0
    ) {
        // Implementation depends on map provider
        // Example for Mapbox:
        val definition = OfflineTilePyramidRegionDefinition(
            "mapbox://styles/mapbox/streets-v11",
            bounds,
            minZoom,
            maxZoom,
            context.resources.displayMetrics.density
        )

        val metadata = JSONObject().apply {
            put("REGION_NAME", regionName)
        }

        offlineManager.createOfflineRegion(definition, metadata.toString(), object : OfflineManager.CreateOfflineRegionCallback {
            override fun onCreate(offlineRegion: OfflineRegion) {
                offlineRegion.setDownloadState(OfflineRegion.STATE_ACTIVE)
            }

            override fun onError(error: String) {
                Log.e("OfflineMap", "Error creating offline region: $error")
            }
        })
    }
}
\`\`\``;
}

export function generateStorageConfiguration(args: any): string {
  const { storageType, encryptionLevel, cacheStrategy, purgePolicy } = args;

  return `# DHIS2 Android Storage Configuration

## Database Technology: ${storageType.toUpperCase()}
## Encryption Level: ${encryptionLevel.toUpperCase()}

${generateDatabaseConfiguration(storageType, encryptionLevel)}

${cacheStrategy ? generateCacheStrategy(cacheStrategy) : ''}

${purgePolicy?.enabled ? generatePurgePolicy(purgePolicy) : ''}

## Usage Examples

\`\`\`kotlin
@Database(
    entities = [DataElement::class, OrganisationUnit::class, Event::class],
    version = 1,
    exportSchema = false
)
${encryptionLevel !== 'none' ? '@TypeConverters(CryptoConverter::class)' : ''}
abstract class DHIS2Database : RoomDatabase() {
    abstract fun dataElementDao(): DataElementDao
    abstract fun organisationUnitDao(): OrganisationUnitDao
    abstract fun eventDao(): EventDao
    
    companion object {
        @Volatile
        private var INSTANCE: DHIS2Database? = null
        
        fun getDatabase(context: Context): DHIS2Database {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    DHIS2Database::class.java,
                    "dhis2_database"
                ).apply {
                    ${encryptionLevel !== 'none' ? 'openHelperFactory(SupportFactory(getPassphrase()))' : ''}
                    ${cacheStrategy ? 'setQueryExecutor(Executors.newFixedThreadPool(4))' : ''}
                }.build()
                INSTANCE = instance
                instance
            }
        }
        
        ${encryptionLevel !== 'none' ? `
        private fun getPassphrase(): ByteArray {
            // Generate or retrieve secure passphrase
            return "your-secure-passphrase".toByteArray()
        }` : ''}
    }
}
\`\`\`
`;
}

function generateDatabaseConfiguration(storageType: string, encryptionLevel: string): string {
  switch (storageType) {
    case 'room':
      return generateRoomConfiguration(encryptionLevel);
    case 'sqlite':
      return generateSQLiteConfiguration(encryptionLevel);
    case 'realm':
      return generateRealmConfiguration(encryptionLevel);
    default:
      return generateRoomConfiguration(encryptionLevel);
  }
}

function generateRoomConfiguration(encryptionLevel: string): string {
  return `
### Room Database Configuration

**Dependencies** (add to build.gradle):
\`\`\`kotlin
dependencies {
    implementation "androidx.room:room-runtime:2.6.1"
    implementation "androidx.room:room-ktx:2.6.1"
    kapt "androidx.room:room-compiler:2.6.1"
    
    ${encryptionLevel !== 'none' ? `// SQLCipher for encryption
    implementation "net.zetetic:android-database-sqlcipher:4.5.4"
    implementation "androidx.sqlite:sqlite:2.4.0"` : ''}
}
\`\`\`

**Entity Example**:
\`\`\`kotlin
@Entity(tableName = "data_elements")
data class DataElement(
    @PrimaryKey val id: String,
    val name: String,
    val shortName: String,
    val valueType: String,
    ${encryptionLevel !== 'none' ? '@Encrypted val sensitiveData: String? = null,' : ''}
    val lastUpdated: Long = System.currentTimeMillis()
)
\`\`\`

**DAO Example**:
\`\`\`kotlin
@Dao
interface DataElementDao {
    @Query("SELECT * FROM data_elements WHERE id = :id")
    suspend fun getById(id: String): DataElement?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(dataElement: DataElement)
    
    @Query("DELETE FROM data_elements WHERE lastUpdated < :threshold")
    suspend fun deleteOldRecords(threshold: Long)
}
\`\`\`
`;
}

function generateSQLiteConfiguration(encryptionLevel: string): string {
  return `
### SQLite Database Configuration

\`\`\`kotlin
class DHIS2DatabaseHelper(context: Context) : SQLiteOpenHelper(
    context,
    DATABASE_NAME,
    null,
    DATABASE_VERSION
) {
    
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(CREATE_DATA_ELEMENTS_TABLE)
        db.execSQL(CREATE_ORG_UNITS_TABLE)
        db.execSQL(CREATE_EVENTS_TABLE)
    }
    
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Handle database upgrades
        when (oldVersion) {
            1 -> upgradeToVersion2(db)
        }
    }
    
    companion object {
        private const val DATABASE_NAME = "dhis2.db"
        private const val DATABASE_VERSION = 1
        
        private const val CREATE_DATA_ELEMENTS_TABLE = """
            CREATE TABLE data_elements (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                value_type TEXT NOT NULL,
                last_updated INTEGER DEFAULT CURRENT_TIMESTAMP
            )
        """
    }
}
\`\`\`
`;
}

function generateRealmConfiguration(encryptionLevel: string): string {
  return `
### Realm Database Configuration

\`\`\`kotlin
class DHIS2Application : Application() {
    override fun onCreate() {
        super.onCreate()
        
        Realm.init(this)
        val config = RealmConfiguration.Builder()
            .name("dhis2.realm")
            .schemaVersion(1)
            ${encryptionLevel !== 'none' ? '.encryptionKey(getEncryptionKey())' : ''}
            .migration { realm, oldVersion, newVersion ->
                // Handle migrations
            }
            .build()
        
        Realm.setDefaultConfiguration(config)
    }
    
    ${encryptionLevel !== 'none' ? `
    private fun getEncryptionKey(): ByteArray {
        // Generate 64-byte encryption key
        return ByteArray(64) { 0x12 }
    }` : ''}
}

open class DataElement : RealmObject() {
    @PrimaryKey
    var id: String = ""
    var name: String = ""
    var shortName: String = ""
    var valueType: String = ""
    var lastUpdated: Long = 0
}
\`\`\`
`;
}

function generateCacheStrategy(cacheStrategy: any): string {
  return `
## Cache Strategy Configuration

${cacheStrategy.metadata ? `
### Metadata Cache
- **TTL**: ${cacheStrategy.metadata.ttl} hours
- **Max Size**: ${cacheStrategy.metadata.maxSize}MB

\`\`\`kotlin
@Singleton
class MetadataCache @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val cache = LruCache<String, Any>(${cacheStrategy.metadata.maxSize} * 1024 * 1024) // ${cacheStrategy.metadata.maxSize}MB
    
    fun put(key: String, value: Any) {
        val expiryTime = System.currentTimeMillis() + TimeUnit.HOURS.toMillis(${cacheStrategy.metadata.ttl})
        cache.put(key, CacheItem(value, expiryTime))
    }
    
    fun get(key: String): Any? {
        val item = cache.get(key) as? CacheItem ?: return null
        return if (item.isExpired()) {
            cache.remove(key)
            null
        } else {
            item.value
        }
    }
}

data class CacheItem(val value: Any, val expiryTime: Long) {
    fun isExpired(): Boolean = System.currentTimeMillis() > expiryTime
}
\`\`\`` : ''}

${cacheStrategy.images ? `
### Image Cache  
- **Compression**: ${cacheStrategy.images.compression ? 'Enabled' : 'Disabled'}
- **Max Resolution**: ${cacheStrategy.images.maxResolution}

\`\`\`kotlin
@Singleton
class ImageCache @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val diskCache by lazy {
        DiskLruCache.open(
            File(context.cacheDir, "images"),
            1,
            1,
            50 * 1024 * 1024 // 50MB
        )
    }
    
    suspend fun cacheImage(url: String, bitmap: Bitmap) = withContext(Dispatchers.IO) {
        val key = hashKeyForDisk(url)
        diskCache.edit(key)?.let { editor ->
            val outputStream = editor.newOutputStream(0)
            ${cacheStrategy.images.compression ? `
            bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
            ` : `
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
            `}
            outputStream.close()
            editor.commit()
        }
    }
}
\`\`\`` : ''}
`;
}

function generatePurgePolicy(purgePolicy: any): string {
  return `
## Data Purge Policy

**Retention Period**: ${purgePolicy.retentionDays} days  
**Triggers**: ${purgePolicy.conditions.join(', ')}

\`\`\`kotlin
@Singleton
class DataPurgeManager @Inject constructor(
    private val database: DHIS2Database,
    @ApplicationContext private val context: Context
) {
    
    suspend fun purgeOldData() {
        val threshold = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(${purgePolicy.retentionDays})
        
        database.withTransaction {
            database.dataElementDao().deleteOldRecords(threshold)
            database.eventDao().deleteOldRecords(threshold)
            database.organisationUnitDao().deleteOldRecords(threshold)
        }
    }
    
    fun checkPurgeConditions() {
        ${purgePolicy.conditions.includes('storage_full') ? `
        val storageInfo = getStorageInfo()
        if (storageInfo.availableBytes < 100 * 1024 * 1024) { // 100MB
            lifecycleScope.launch { purgeOldData() }
        }` : ''}
        
        ${purgePolicy.conditions.includes('data_old') ? `
        val lastPurge = getLastPurgeTime()
        if (System.currentTimeMillis() - lastPurge > TimeUnit.DAYS.toMillis(7)) {
            lifecycleScope.launch { purgeOldData() }
        }` : ''}
    }
    
    private fun getStorageInfo(): StorageInfo {
        val stat = StatFs(context.filesDir.path)
        return StorageInfo(
            totalBytes = stat.blockCountLong * stat.blockSizeLong,
            availableBytes = stat.availableBlocksLong * stat.blockSizeLong
        )
    }
}

data class StorageInfo(val totalBytes: Long, val availableBytes: Long)
\`\`\`
`;
}

export function generateCameraConfiguration(args: any): string {
  const { cameraFeatures, imageSettings, videoSettings, barcodeTypes, permissions } = args;

  return `# DHIS2 Android Camera Configuration

## Features: ${cameraFeatures.join(', ')}

${generateCameraPermissions(permissions)}

${generateCameraImplementation(cameraFeatures, imageSettings, videoSettings, barcodeTypes)}

${cameraFeatures.includes('barcode_scanning') ? generateBarcodeScanning(barcodeTypes) : ''}

## Usage Examples

\`\`\`kotlin
class DataCaptureActivity : AppCompatActivity() {
    
    private val cameraManager by lazy { DHIS2CameraManager(this) }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        binding.capturePhotoButton.setOnClickListener {
            capturePhoto()
        }
        
        ${cameraFeatures.includes('barcode_scanning') ? `
        binding.scanBarcodeButton.setOnClickListener {
            scanBarcode()
        }` : ''}
    }
    
    private fun capturePhoto() {
        cameraManager.capturePhoto { result ->
            when (result) {
                is CameraResult.Success -> {
                    // Handle captured photo
                    handleCapturedPhoto(result.imageUri)
                }
                is CameraResult.Error -> {
                    showError(result.message)
                }
            }
        }
    }
    
    ${cameraFeatures.includes('barcode_scanning') ? `
    private fun scanBarcode() {
        cameraManager.scanBarcode { barcode ->
            // Handle scanned barcode
            updateDataElementWithBarcode(barcode)
        }
    }` : ''}
}
\`\`\`
`;
}

function generateCameraPermissions(permissions: string[]): string {
  return `
## Required Permissions

Add to AndroidManifest.xml:
\`\`\`xml
${permissions.includes('camera') ? '<uses-permission android:name="android.permission.CAMERA" />' : ''}
${permissions.includes('write_external_storage') ? '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />' : ''}
${permissions.includes('record_audio') ? '<uses-permission android:name="android.permission.RECORD_AUDIO" />' : ''}

<!-- Camera hardware features -->
<uses-feature 
    android:name="android.hardware.camera"
    android:required="true" />
<uses-feature 
    android:name="android.hardware.camera.autofocus"
    android:required="false" />
\`\`\`
`;
}

function generateCameraImplementation(cameraFeatures: string[], imageSettings: any, videoSettings: any, barcodeTypes: string[]): string {
  return `
## Camera Manager Implementation

\`\`\`kotlin
class DHIS2CameraManager(private val context: Context) {
    
    private val imageCapture = ImageCapture.Builder()
        ${imageSettings?.compression ? `.setJpegQuality(${imageSettings.compression.quality})` : ''}
        .build()
    
    ${cameraFeatures.includes('video_recording') ? `
    private val videoCapture = VideoCapture.Builder()
        ${videoSettings?.quality ? `.setQualitySelector(QualitySelector.from(Quality.${videoSettings.quality.toUpperCase()}))` : ''}
        .build()
    ` : ''}
    
    fun capturePhoto(callback: (CameraResult) -> Unit) {
        val outputFileOptions = ImageCapture.OutputFileOptions.Builder(createImageFile()).build()
        
        imageCapture.takePicture(
            outputFileOptions,
            ContextCompat.getMainExecutor(context),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    ${imageSettings?.watermark ? 'addWatermark(output.savedUri)' : ''}
                    callback(CameraResult.Success(output.savedUri))
                }
                
                override fun onError(exception: ImageCaptureException) {
                    callback(CameraResult.Error(exception.message ?: "Image capture failed"))
                }
            }
        )
    }
    
    ${cameraFeatures.includes('video_recording') ? `
    fun recordVideo(callback: (CameraResult) -> Unit) {
        val outputFile = createVideoFile()
        val recording = videoCapture.prepareRecording(context, FileOutputOptions.Builder(outputFile).build())
            .start(ContextCompat.getMainExecutor(context)) { recordEvent ->
                when (recordEvent) {
                    is VideoRecordEvent.Start -> {
                        // Recording started
                    }
                    is VideoRecordEvent.Finalize -> {
                        if (recordEvent.hasError()) {
                            callback(CameraResult.Error("Video recording failed"))
                        } else {
                            callback(CameraResult.Success(recordEvent.outputResults.outputUri))
                        }
                    }
                }
            }
    }` : ''}
    
    private fun createImageFile(): File {
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val imageFileName = "DHIS2_\${timestamp}"
        val storageDir = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile(imageFileName, ".jpg", storageDir)
    }
    
    ${imageSettings?.watermark ? `
    private fun addWatermark(imageUri: Uri?) {
        // Add timestamp and location watermark to image
        imageUri?.let { uri ->
            val bitmap = BitmapFactory.decodeFile(uri.path)
            val canvas = Canvas(bitmap)
            val paint = Paint().apply {
                color = Color.WHITE
                textSize = 48f
                isAntiAlias = true
            }
            
            val timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
            canvas.drawText(timestamp, 50f, bitmap.height - 100f, paint)
            
            // Save watermarked image
            val outputStream = context.contentResolver.openOutputStream(uri)
            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, outputStream)
            outputStream?.close()
        }
    }` : ''}
}

sealed class CameraResult {
    data class Success(val imageUri: Uri?) : CameraResult()
    data class Error(val message: String) : CameraResult()
}
\`\`\`
`;
}

function generateBarcodeScanning(barcodeTypes: string[]): string {
  return `
## Barcode Scanning Implementation

**Dependencies**:
\`\`\`kotlin
dependencies {
    implementation 'com.google.mlkit:barcode-scanning:17.2.0'
}
\`\`\`

**Barcode Scanner**:
\`\`\`kotlin
class BarcodeScanner {
    
    private val scanner = BarcodeScanning.getClient(
        BarcodeScannerOptions.Builder()
            .setBarcodeFormats(
                ${barcodeTypes.map((type: string) => getBarcodeFormat(type)).join(',\n                ')}
            )
            .build()
    )
    
    fun scanBarcodeFromImage(imageProxy: ImageProxy, callback: (String?) -> Unit) {
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
            scanner.process(image)
                .addOnSuccessListener { barcodes ->
                    val barcode = barcodes.firstOrNull()
                    callback(barcode?.rawValue)
                }
                .addOnFailureListener { exception ->
                    Log.e("BarcodeScanner", "Scanning failed", exception)
                    callback(null)
                }
                .addOnCompleteListener {
                    imageProxy.close()
                }
        }
    }
}

// Camera analysis for real-time barcode scanning
class BarcodeAnalyzer(private val callback: (String) -> Unit) : ImageAnalysis.Analyzer {
    
    private val barcodeScanner = BarcodeScanner()
    
    override fun analyze(imageProxy: ImageProxy) {
        barcodeScanner.scanBarcodeFromImage(imageProxy) { barcode ->
            barcode?.let { callback(it) }
        }
    }
}
\`\`\`

**Usage in CameraX**:
\`\`\`kotlin
private fun startBarcodeScanning() {
    val imageAnalysis = ImageAnalysis.Builder()
        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        .build()
    
    imageAnalysis.setAnalyzer(
        ContextCompat.getMainExecutor(this),
        BarcodeAnalyzer { barcode ->
            // Handle scanned barcode
            handleScannedBarcode(barcode)
        }
    )
}
\`\`\`
`;
}

function getBarcodeFormat(type: string): string {
  switch (type) {
    case 'qr_code': return 'Barcode.FORMAT_QR_CODE';
    case 'barcode_128': return 'Barcode.FORMAT_CODE_128';
    case 'data_matrix': return 'Barcode.FORMAT_DATA_MATRIX';
    case 'pdf417': return 'Barcode.FORMAT_PDF417';
    default: return 'Barcode.FORMAT_QR_CODE';
  }
}

// Add more missing functions...

export function generateAndroidAuthenticationConfig(args: any): string {
  return `# DHIS2 Android Authentication Configuration

Authentication methods: ${args.authMethods.join(', ')}

## Implementation details for Android authentication patterns...
`;
}

export function generateDataModelsConfiguration(args: any): string {
  return `# DHIS2 Android Data Models Configuration

Entities: ${args.entities.join(', ')}
Architecture: ${args.architecture}

## Implementation details for data models...
`;
}

export function generateAndroidTestingConfiguration(args: any): string {
  return `# DHIS2 Android Testing Configuration

Testing frameworks: ${args.testingFrameworks.join(', ')}
Test types: ${args.testTypes.join(', ')}

## Implementation details for testing setup...
`;
}

export function generateAndroidUIConfiguration(args: any): string {
  return `# DHIS2 Android UI Configuration

UI Framework: ${args.uiFramework}
Components: ${args.components.join(', ')}

## Implementation details for UI patterns...
`;
}

export function generateOfflineAnalyticsConfiguration(args: any): string {
  return `# DHIS2 Android Offline Analytics Configuration

Analytics features: ${args.analyticsFeatures.join(', ')}

## Implementation details for offline analytics...
`;
}

export function generateNotificationsConfiguration(args: any): string {
  return `# DHIS2 Android Notifications Configuration

Notification types: ${args.notificationTypes.join(', ')}

## Implementation details for notifications...
`;
}

export function generatePerformanceOptimizationConfiguration(args: any): string {
  return `# DHIS2 Android Performance Optimization Configuration

Optimization areas: ${args.optimizationAreas.join(', ')}

## Implementation details for performance optimization...
`;
}