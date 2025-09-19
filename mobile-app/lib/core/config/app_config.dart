class AppConfig {
  // App Information
  static const String appName = 'Smart Health Monitor';
  static const String appVersion = '1.0.0';
  static const String appBuildNumber = '1';
  
  // API Configuration
  static const String baseUrl = 'https://your-backend-url.com/api';
  static const String apiVersion = 'v1';
  static const Duration apiTimeout = Duration(seconds: 30);
  
  // Firebase Configuration
  static const String firebaseProjectId = 'smart-health-monitoring';
  static const String firebaseMessagingSenderId = 'your-sender-id';
  
  // Supabase Configuration
  static const String supabaseUrl = 'https://your-project.supabase.co';
  static const String supabaseAnonKey = 'your-supabase-anon-key';
  
  // Twilio Configuration
  static const String twilioAccountSid = 'your-twilio-account-sid';
  static const String twilioAuthToken = 'your-twilio-auth-token';
  static const String twilioPhoneNumber = '+1234567890';
  
  // Map Configuration
  static const String googleMapsApiKey = 'your-google-maps-api-key';
  
  // Storage Keys
  static const String userTokenKey = 'user_token';
  static const String userDataKey = 'user_data';
  static const String settingsKey = 'app_settings';
  static const String offlineDataKey = 'offline_data';
  
  // Notification Configuration
  static const String notificationChannelId = 'health_alerts';
  static const String notificationChannelName = 'Health Alerts';
  static const String notificationChannelDescription = 'Important health and outbreak alerts';
  
  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  // Cache Configuration
  static const Duration cacheExpiration = Duration(hours: 1);
  static const int maxCacheSize = 50 * 1024 * 1024; // 50MB
  
  // Validation Rules
  static const int minPasswordLength = 8;
  static const int maxPasswordLength = 128;
  static const int maxNameLength = 100;
  static const int maxDescriptionLength = 500;
  
  // Health Monitoring
  static const Duration healthCheckInterval = Duration(minutes: 5);
  static const Duration symptomReportCooldown = Duration(hours: 1);
  
  // Outbreak Risk Levels
  static const String riskLevelLow = 'low';
  static const String riskLevelMedium = 'medium';
  static const String riskLevelHigh = 'high';
  
  // Supported Languages
  static const List<String> supportedLanguages = [
    'en', // English
    'es', // Spanish
    'fr', // French
    'de', // German
    'hi', // Hindi
    'zh', // Chinese
    'ar', // Arabic
  ];
  
  // Feature Flags
  static const bool enableOfflineMode = true;
  static const bool enablePushNotifications = true;
  static const bool enableLocationTracking = true;
  static const bool enableBiometricAuth = true;
  static const bool enableDarkMode = true;
  static const bool enableMultiLanguage = true;
  
  // Development Configuration
  static const bool isDebugMode = true;
  static const bool enableLogging = true;
  static const bool enableCrashReporting = true;
  static const bool enableAnalytics = true;
}
