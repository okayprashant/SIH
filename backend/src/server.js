const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('express-async-errors');
require('dotenv').config();

const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const { validateApiKey } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const sensorRoutes = require('./routes/sensors');
const healthReportRoutes = require('./routes/healthReports');
const alertRoutes = require('./routes/alerts');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');

// Import services
const DatabaseService = require('./services/database');
const RedisService = require('./services/redis');
const NotificationService = require('./services/notification');
const AIService = require('./services/ai');

class Server {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });
    
    this.port = config.server.port;
    this.host = config.server.host;
    
    this.initializeServices();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSocketIO();
  }

  async initializeServices() {
    try {
      // Initialize database
      await DatabaseService.initialize();
      logger.info('Database connected successfully');

      // Initialize Redis
      await RedisService.initialize();
      logger.info('Redis connected successfully');

      // Initialize notification service
      await NotificationService.initialize();
      logger.info('Notification service initialized');

      // Initialize AI service
      await AIService.initialize();
      logger.info('AI service initialized');

    } catch (error) {
      logger.error('Failed to initialize services:', error);
      process.exit(1);
    }
  }

  initializeMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    }));

    // Compression middleware
    this.app.use(compression());

    // Request logging
    this.app.use(morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) }
    }));

    // Custom request logger
    this.app.use(requestLogger);

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.server.environment,
      });
    });

    // API documentation
    this.app.get('/api-docs', (req, res) => {
      res.json({
        message: 'Smart Health Monitoring API',
        version: '1.0.0',
        documentation: '/api-docs/swagger',
        endpoints: {
          auth: '/api/auth',
          users: '/api/users',
          sensors: '/api/sensors',
          healthReports: '/api/health-reports',
          alerts: '/api/alerts',
          dashboard: '/api/dashboard',
          admin: '/api/admin',
        },
      });
    });
  }

  initializeRoutes() {
    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', validateApiKey, userRoutes);
    this.app.use('/api/sensors', validateApiKey, sensorRoutes);
    this.app.use('/api/health-reports', validateApiKey, healthReportRoutes);
    this.app.use('/api/alerts', validateApiKey, alertRoutes);
    this.app.use('/api/dashboard', validateApiKey, dashboardRoutes);
    this.app.use('/api/admin', validateApiKey, adminRoutes);

    // WebSocket endpoint for real-time updates
    this.app.get('/ws', (req, res) => {
      res.json({ message: 'WebSocket endpoint available at /socket.io/' });
    });
  }

  initializeErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  initializeSocketIO() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Join user to their personal room
      socket.on('join-user-room', (userId) => {
        socket.join(`user-${userId}`);
        logger.info(`User ${userId} joined their room`);
      });

      // Join admin room
      socket.on('join-admin-room', () => {
        socket.join('admin-room');
        logger.info(`Admin joined admin room`);
      });

      // Handle sensor data updates
      socket.on('sensor-data-update', (data) => {
        this.io.to('admin-room').emit('sensor-data-update', data);
      });

      // Handle health report updates
      socket.on('health-report-update', (data) => {
        this.io.to('admin-room').emit('health-report-update', data);
      });

      // Handle alert updates
      socket.on('alert-update', (data) => {
        this.io.emit('alert-update', data);
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  async start() {
    try {
      this.server.listen(this.port, this.host, () => {
        logger.info(`🚀 Server running on http://${this.host}:${this.port}`);
        logger.info(`📊 Environment: ${config.server.environment}`);
        logger.info(`🔗 API Documentation: http://${this.host}:${this.port}/api-docs`);
        logger.info(`💚 Health Check: http://${this.host}:${this.port}/health`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down server...');
    
    try {
      // Close HTTP server
      this.server.close(() => {
        logger.info('HTTP server closed');
      });

      // Close database connections
      await DatabaseService.close();
      logger.info('Database connections closed');

      // Close Redis connections
      await RedisService.close();
      logger.info('Redis connections closed');

      // Close Socket.IO
      this.io.close();
      logger.info('Socket.IO closed');

      logger.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Create and start server
const server = new Server();
server.start();

module.exports = server;
