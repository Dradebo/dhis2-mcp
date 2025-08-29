import { 
  generateAndroidProjectInit,
  generateGradleBuildConfig,
  generateSyncConfiguration,
  generateLocationServicesConfig,
  generateStorageConfiguration,
  generateCameraConfiguration,
  AndroidProjectConfig,
  GradleConfig
} from '../src/android-generators';

describe('Android Generators', () => {
  describe('generateAndroidProjectInit', () => {
    const mockConfig: AndroidProjectConfig = {
      projectName: 'dhis2-test-app',
      applicationId: 'org.dhis2.testapp',
      minSdkVersion: 21,
      targetSdkVersion: 34,
      language: 'kotlin',
      dhis2SdkVersion: '1.10.0',
      features: ['offline_sync', 'gps_capture'],
      architecture: 'mvvm'
    };

    it('should generate android project initialization guide', () => {
      const result = generateAndroidProjectInit(mockConfig);
      
      expect(result).toContain('DHIS2 Android Project Initialization Guide');
      expect(result).toContain(mockConfig.projectName);
      expect(result).toContain(mockConfig.applicationId);
      expect(result).toContain('MainActivity.kt'); // Kotlin extension
    });

    it('should handle Java language correctly', () => {
      const javaConfig = { ...mockConfig, language: 'java' as const };
      const result = generateAndroidProjectInit(javaConfig);
      
      expect(result).toContain('MainActivity.java');
      expect(result).toContain('.java');
    });

    it('should include GPS permissions when GPS feature is enabled', () => {
      const result = generateAndroidProjectInit(mockConfig);
      
      expect(result).toContain('ACCESS_FINE_LOCATION');
      expect(result).toContain('ACCESS_COARSE_LOCATION');
    });

    it('should include architecture pattern description', () => {
      const result = generateAndroidProjectInit(mockConfig);
      
      expect(result).toContain('MVVM');
      expect(result).toContain('Model-View-ViewModel');
    });

    it('should include required permissions based on features', () => {
      const configWithCamera = { 
        ...mockConfig, 
        features: ['offline_sync', 'camera_integration', 'encrypted_storage']
      };
      const result = generateAndroidProjectInit(configWithCamera);
      
      expect(result).toContain('CAMERA');
      expect(result).toContain('USE_FINGERPRINT');
      expect(result).toContain('RECEIVE_BOOT_COMPLETED');
    });
  });

  describe('generateGradleBuildConfig', () => {
    const mockGradleConfig: GradleConfig = {
      dhis2SdkVersion: '1.10.0',
      buildFeatures: {
        compose: true,
        viewBinding: true,
        dataBinding: false
      },
      proguardRules: true,
      buildVariants: [
        { name: 'dev', dhis2Instance: 'https://play.dhis2.org/dev' },
        { name: 'prod', dhis2Instance: 'https://dhis2.org' }
      ],
      additionalLibraries: ['room', 'dagger_hilt', 'coroutines']
    };

    it('should generate gradle build configuration', () => {
      const result = generateGradleBuildConfig(mockGradleConfig);
      
      expect(result).toContain('Android Gradle Build Configuration');
      expect(result).toContain('app/build.gradle.kts');
      expect(result).toContain(mockGradleConfig.dhis2SdkVersion);
    });

    it('should include Jetpack Compose when enabled', () => {
      const result = generateGradleBuildConfig(mockGradleConfig);
      
      expect(result).toContain('compose = true');
      expect(result).toContain('androidx.compose');
    });

    it('should include build variants', () => {
      const result = generateGradleBuildConfig(mockGradleConfig);
      
      expect(result).toContain('create("dev")');
      expect(result).toContain('create("prod")');
      expect(result).toContain('https://play.dhis2.org/dev');
      expect(result).toContain('https://dhis2.org');
    });

    it('should include additional libraries', () => {
      const result = generateGradleBuildConfig(mockGradleConfig);
      
      expect(result).toContain('androidx.room:room-runtime');
      expect(result).toContain('com.google.dagger:hilt-android');
      expect(result).toContain('kotlinx-coroutines-core');
    });

    it('should include ProGuard configuration when enabled', () => {
      const result = generateGradleBuildConfig(mockGradleConfig);
      
      expect(result).toContain('proguard-rules.pro');
      expect(result).toContain('DHIS2 Android SDK ProGuard Rules');
    });

    it('should handle configuration without Compose', () => {
      const configWithoutCompose = {
        ...mockGradleConfig,
        buildFeatures: { compose: false, viewBinding: true }
      };
      const result = generateGradleBuildConfig(configWithoutCompose);
      
      expect(result).not.toContain('compose = true');
      expect(result).toContain('viewBinding = true');
    });
  });

  describe('generateSyncConfiguration', () => {
    const mockSyncArgs = {
      syncStrategy: 'automatic',
      syncScope: {
        metadata: true,
        dataValues: true,
        events: false,
        enrollments: false
      },
      conflictResolution: 'server_wins',
      networkConditions: {
        wifiOnly: false,
        backgroundSync: true,
        chunkSize: 1024
      },
      progressTracking: true
    };

    it('should generate sync configuration', () => {
      const result = generateSyncConfiguration(mockSyncArgs);
      
      expect(result).toContain('DHIS2 Android Sync Configuration');
      expect(result).toContain('automatic synchronization');
      expect(result).toContain('server_wins conflict resolution');
    });

    it('should include sync manager implementation', () => {
      const result = generateSyncConfiguration(mockSyncArgs);
      
      expect(result).toContain('class SyncManager');
      expect(result).toContain('performSync');
      expect(result).toContain('syncMetadata()');
      expect(result).toContain('syncDataValues()');
    });

    it('should handle different sync strategies', () => {
      const manualSyncArgs = { ...mockSyncArgs, syncStrategy: 'manual' };
      const result = generateSyncConfiguration(manualSyncArgs);
      
      expect(result).toContain('performManualSync');
    });

    it('should include progress tracking when enabled', () => {
      const result = generateSyncConfiguration(mockSyncArgs);
      
      expect(result).toContain('updateProgress');
      expect(result).toContain('SyncProgressListener');
    });

    it('should handle WiFi-only configuration', () => {
      const wifiOnlyArgs = {
        ...mockSyncArgs,
        networkConditions: { wifiOnly: true, backgroundSync: false }
      };
      const result = generateSyncConfiguration(wifiOnlyArgs);
      
      expect(result).toContain('isWiFiConnected');
    });
  });

  describe('generateLocationServicesConfig', () => {
    const mockLocationArgs = {
      locationAccuracy: 'high',
      permissions: {
        fineLocation: true,
        coarseLocation: true,
        backgroundLocation: false
      },
      geofencing: {
        enabled: true,
        radius: 100,
        triggers: ['enter', 'exit']
      },
      coordinateCapture: {
        validation: true,
        accuracyThreshold: 10,
        timeoutSeconds: 30
      },
      offlineMapping: true
    };

    it('should generate location services configuration', () => {
      const result = generateLocationServicesConfig(mockLocationArgs);
      
      expect(result).toContain('DHIS2 Android Location Services Configuration');
      expect(result).toContain('Location Accuracy: HIGH');
    });

    it('should include required permissions', () => {
      const result = generateLocationServicesConfig(mockLocationArgs);
      
      expect(result).toContain('ACCESS_FINE_LOCATION');
      expect(result).toContain('ACCESS_COARSE_LOCATION');
      expect(result).not.toContain('ACCESS_BACKGROUND_LOCATION');
    });

    it('should include geofencing implementation when enabled', () => {
      const result = generateLocationServicesConfig(mockLocationArgs);
      
      expect(result).toContain('GeofenceManager');
      expect(result).toContain('addGeofence');
      expect(result).toContain('GEOFENCE_TRANSITION_ENTER');
      expect(result).toContain('GEOFENCE_TRANSITION_EXIT');
    });

    it('should include coordinate validation', () => {
      const result = generateLocationServicesConfig(mockLocationArgs);
      
      expect(result).toContain('isLocationAccurate');
      expect(result).toContain('10f'); // The actual accuracy threshold value
    });

    it('should include offline mapping when enabled', () => {
      const result = generateLocationServicesConfig(mockLocationArgs);
      
      expect(result).toContain('OfflineMapManager');
      expect(result).toContain('downloadOfflineRegion');
    });
  });

  describe('generateStorageConfiguration', () => {
    const mockStorageArgs = {
      storageType: 'room',
      encryptionLevel: 'basic',
      cacheStrategy: {
        metadata: {
          ttl: 24,
          maxSize: 50
        },
        images: {
          compression: true,
          maxResolution: '1920x1080'
        }
      },
      purgePolicy: {
        enabled: true,
        retentionDays: 30,
        conditions: ['storage_full', 'data_old']
      }
    };

    it('should generate storage configuration', () => {
      const result = generateStorageConfiguration(mockStorageArgs);
      
      expect(result).toContain('DHIS2 Android Storage Configuration');
      expect(result).toContain('Database Technology: ROOM');
      expect(result).toContain('Encryption Level: BASIC');
    });

    it('should include Room database configuration', () => {
      const result = generateStorageConfiguration(mockStorageArgs);
      
      expect(result).toContain('androidx.room:room-runtime');
      expect(result).toContain('@Entity');
      expect(result).toContain('@Dao');
    });

    it('should include cache strategy', () => {
      const result = generateStorageConfiguration(mockStorageArgs);
      
      expect(result).toContain('MetadataCache');
      expect(result).toContain('24 hours');
      expect(result).toContain('50MB');
    });

    it('should include purge policy', () => {
      const result = generateStorageConfiguration(mockStorageArgs);
      
      expect(result).toContain('DataPurgeManager');
      expect(result).toContain('30 days');
      expect(result).toContain('storage_full, data_old');
    });

    it('should handle different storage types', () => {
      const sqliteArgs = { ...mockStorageArgs, storageType: 'sqlite' };
      const result = generateStorageConfiguration(sqliteArgs);
      
      expect(result).toContain('SQLiteOpenHelper');
    });
  });

  describe('generateCameraConfiguration', () => {
    const mockCameraArgs = {
      cameraFeatures: ['photo_capture', 'barcode_scanning'],
      imageSettings: {
        maxResolution: '1920x1080',
        compression: {
          quality: 80,
          format: 'jpeg'
        },
        watermark: true
      },
      videoSettings: {
        maxDuration: 300,
        quality: 'high'
      },
      barcodeTypes: ['qr_code', 'barcode_128'],
      permissions: ['camera', 'write_external_storage']
    };

    it('should generate camera configuration', () => {
      const result = generateCameraConfiguration(mockCameraArgs);
      
      expect(result).toContain('DHIS2 Android Camera Configuration');
      expect(result).toContain('photo_capture, barcode_scanning');
    });

    it('should include required permissions', () => {
      const result = generateCameraConfiguration(mockCameraArgs);
      
      expect(result).toContain('android.permission.CAMERA');
      expect(result).toContain('android.permission.WRITE_EXTERNAL_STORAGE');
    });

    it('should include camera implementation', () => {
      const result = generateCameraConfiguration(mockCameraArgs);
      
      expect(result).toContain('DHIS2CameraManager');
      expect(result).toContain('capturePhoto');
      expect(result).toContain('ImageCapture');
    });

    it('should include barcode scanning when enabled', () => {
      const result = generateCameraConfiguration(mockCameraArgs);
      
      expect(result).toContain('BarcodeScanning');
      expect(result).toContain('Barcode.FORMAT_QR_CODE');
      expect(result).toContain('Barcode.FORMAT_CODE_128');
    });

    it('should include watermark functionality when enabled', () => {
      const result = generateCameraConfiguration(mockCameraArgs);
      
      expect(result).toContain('addWatermark');
      expect(result).toContain('timestamp');
    });

    it('should handle video recording', () => {
      const videoArgs = {
        ...mockCameraArgs,
        cameraFeatures: ['video_recording']
      };
      const result = generateCameraConfiguration(videoArgs);
      
      expect(result).toContain('VideoCapture');
      expect(result).toContain('recordVideo');
      expect(result).toContain('Quality.HIGH');
    });
  });

  describe('error handling', () => {
    it('should handle missing required parameters gracefully', () => {
      const incompleteConfig = {
        projectName: 'test-app',
        applicationId: undefined,
        language: 'kotlin' as const,
        // missing some properties
      } as any;

      expect(() => generateAndroidProjectInit(incompleteConfig)).not.toThrow();
    });

    it('should provide defaults for optional parameters', () => {
      const minimalConfig: AndroidProjectConfig = {
        projectName: 'test-app',
        applicationId: 'com.test.app',
        minSdkVersion: 21,
        targetSdkVersion: 34,
        language: 'kotlin',
        dhis2SdkVersion: '1.10.0',
        features: [],
        architecture: 'mvvm'
      };

      const result = generateAndroidProjectInit(minimalConfig);
      expect(result).toContain('test-app');
      expect(result).toContain('com.test.app');
    });
  });
});