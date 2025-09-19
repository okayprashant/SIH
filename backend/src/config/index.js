require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1',
  },

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'health_monitoring',
    username: process.env.DB_USER || 'health_user',
    password: process.env.DB_PASSWORD || 'health_password',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
    },
    migrations: {
      directory: './migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: parseInt(process.env.REDIS_DB) || 0,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'smart-health-platform',
    audience: process.env.JWT_AUDIENCE || 'smart-health-users',
  },

  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // requests per window
    message: 'Too many requests from this IP, please try again later.',
  },

  fileUpload: {
    maxSize: parseInt(process.env.FILE_MAX_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  },

  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    from: process.env.EMAIL_FROM || 'noreply@smarthealth.com',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'smart-health-monitoring',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  },

  ai: {
    modelPath: process.env.AI_MODEL_PATH || './models/outbreak_model.pkl',
    apiUrl: process.env.AI_API_URL || 'http://localhost:8000',
    timeout: parseInt(process.env.AI_TIMEOUT) || 30000,
    retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS) || 3,
  },

  monitoring: {
    prometheus: {
      enabled: process.env.PROMETHEUS_ENABLED === 'true',
      port: parseInt(process.env.PROMETHEUS_PORT) || 9090,
    },
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
    },
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      path: process.env.LOG_FILE_PATH || './logs',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
    },
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
    apiKeyHeader: process.env.API_KEY_HEADER || 'X-API-Key',
    allowedApiKeys: process.env.ALLOWED_API_KEYS ? process.env.ALLOWED_API_KEYS.split(',') : [],
  },

  features: {
    registrationEnabled: process.env.REGISTRATION_ENABLED !== 'false',
    emailVerificationRequired: process.env.EMAIL_VERIFICATION_REQUIRED === 'true',
    phoneVerificationRequired: process.env.PHONE_VERIFICATION_REQUIRED === 'true',
    biometricAuthEnabled: process.env.BIOMETRIC_AUTH_ENABLED === 'true',
    offlineModeEnabled: process.env.OFFLINE_MODE_ENABLED !== 'false',
    realTimeUpdatesEnabled: process.env.REAL_TIME_UPDATES_ENABLED !== 'false',
  },

  notifications: {
    sms: {
      enabled: process.env.SMS_ENABLED === 'true',
      provider: process.env.SMS_PROVIDER || 'twilio',
    },
    push: {
      enabled: process.env.PUSH_ENABLED === 'true',
      provider: process.env.PUSH_PROVIDER || 'firebase',
    },
    email: {
      enabled: process.env.EMAIL_ENABLED === 'true',
      provider: process.env.EMAIL_PROVIDER || 'nodemailer',
    },
  },

  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD) || 600, // 10 minutes
  },

  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000, // 30 seconds
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000, // 5 seconds
  },

  // Development specific settings
  development: {
    enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
    enableCors: process.env.ENABLE_CORS !== 'false',
    enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
    enableHelmet: process.env.ENABLE_HELMET !== 'false',
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Log configuration (without sensitive data)
console.log('🔧 Configuration loaded:');
console.log(`   Environment: ${config.server.environment}`);
console.log(`   Port: ${config.server.port}`);
console.log(`   Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
console.log(`   Redis: ${config.redis.host}:${config.redis.port}`);
console.log(`   CORS Origins: ${config.cors.origin.join(', ')}`);

module.exports = config;
