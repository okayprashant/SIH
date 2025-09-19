const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const SensorController = require('../controllers/sensorController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { rateLimitByIP } = require('../middleware/rateLimiting');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const sensorDataValidation = [
  body('deviceId').isString().isLength({ min: 1, max: 100 }).withMessage('Device ID is required'),
  body('timestamp').isISO8601().withMessage('Timestamp must be a valid ISO 8601 date'),
  body('sensors').isObject().withMessage('Sensors data is required'),
  body('sensors.pH').isFloat({ min: 0, max: 14 }).withMessage('pH must be between 0 and 14'),
  body('sensors.turbidity').isFloat({ min: 0, max: 100 }).withMessage('Turbidity must be between 0 and 100'),
  body('sensors.temperature').isFloat({ min: -40, max: 125 }).withMessage('Temperature must be between -40 and 125°C'),
  body('sensors.tds').isFloat({ min: 0, max: 1000 }).withMessage('TDS must be between 0 and 1000'),
  body('location').optional().isObject().withMessage('Location must be an object'),
  body('location.latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('location.longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
];

const sensorQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('deviceId').optional().isString().withMessage('Device ID must be a string'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('sensorType').optional().isIn(['pH', 'turbidity', 'temperature', 'tds']).withMessage('Invalid sensor type'),
];

const deviceIdValidation = [
  param('deviceId').isString().isLength({ min: 1, max: 100 }).withMessage('Invalid device ID'),
];

// Routes

/**
 * @swagger
 * /api/sensors/data:
 *   post:
 *     summary: Submit sensor data
 *     tags: [Sensors]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - timestamp
 *               - sensors
 *             properties:
 *               deviceId:
 *                 type: string
 *                 description: Unique device identifier
 *                 example: "WQS-123456"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 timestamp
 *                 example: "2024-01-15T10:30:00Z"
 *               sensors:
 *                 type: object
 *                 properties:
 *                   pH:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 14
 *                     example: 7.2
 *                   turbidity:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 100
 *                     example: 15.5
 *                   temperature:
 *                     type: number
 *                     minimum: -40
 *                     maximum: 125
 *                     example: 25.3
 *                   tds:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1000
 *                     example: 120.0
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     minimum: -90
 *                     maximum: 90
 *                     example: 40.7128
 *                   longitude:
 *                     type: number
 *                     minimum: -180
 *                     maximum: 180
 *                     example: -74.0060
 *     responses:
 *       201:
 *         description: Sensor data submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Sensor data submitted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "sensor_data_123"
 *                     deviceId:
 *                       type: string
 *                       example: "WQS-123456"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - invalid API key
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
router.post(
  '/data',
  rateLimitByIP(100, 15), // 100 requests per 15 minutes
  sensorDataValidation,
  validateRequest,
  async (req, res) => {
    try {
      const result = await SensorController.submitSensorData(req.body);
      
      logger.info('Sensor data submitted', {
        deviceId: req.body.deviceId,
        timestamp: req.body.timestamp,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Sensor data submitted successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Error submitting sensor data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit sensor data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /api/sensors/data:
 *   get:
 *     summary: Get sensor data with filtering and pagination
 *     tags: [Sensors]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *         description: Filter by device ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter data from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter data until this date
 *       - in: query
 *         name: sensorType
 *         schema:
 *           type: string
 *           enum: [pH, turbidity, temperature, tds]
 *         description: Filter by specific sensor type
 *     responses:
 *       200:
 *         description: Sensor data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "sensor_data_123"
 *                       deviceId:
 *                         type: string
 *                         example: "WQS-123456"
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00Z"
 *                       sensors:
 *                         type: object
 *                         properties:
 *                           pH:
 *                             type: number
 *                             example: 7.2
 *                           turbidity:
 *                             type: number
 *                             example: 15.5
 *                           temperature:
 *                             type: number
 *                             example: 25.3
 *                           tds:
 *                             type: number
 *                             example: 120.0
 *                       location:
 *                         type: object
 *                         properties:
 *                           latitude:
 *                             type: number
 *                             example: 40.7128
 *                           longitude:
 *                             type: number
 *                             example: -74.0060
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     pages:
 *                       type: integer
 *                       example: 5
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - invalid API key
 *       500:
 *         description: Internal server error
 */
router.get(
  '/data',
  authenticateToken,
  sensorQueryValidation,
  validateRequest,
  async (req, res) => {
    try {
      const result = await SensorController.getSensorData(req.query);
      
      logger.info('Sensor data retrieved', {
        query: req.query,
        userId: req.user?.id,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error retrieving sensor data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve sensor data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /api/sensors/devices:
 *   get:
 *     summary: Get list of registered sensor devices
 *     tags: [Sensors]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *         description: Filter by device status
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location name or area
 *     responses:
 *       200:
 *         description: Device list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "WQS-123456"
 *                       name:
 *                         type: string
 *                         example: "Water Quality Sensor #1"
 *                       status:
 *                         type: string
 *                         enum: [active, inactive, maintenance]
 *                         example: "active"
 *                       location:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "Central Park"
 *                           latitude:
 *                             type: number
 *                             example: 40.7128
 *                           longitude:
 *                             type: number
 *                             example: -74.0060
 *                       lastSeen:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00Z"
 *                       batteryLevel:
 *                         type: number
 *                         example: 85
 *       401:
 *         description: Unauthorized - invalid API key
 *       500:
 *         description: Internal server error
 */
router.get(
  '/devices',
  authenticateToken,
  async (req, res) => {
    try {
      const devices = await SensorController.getDevices(req.query);
      
      res.json({
        success: true,
        data: devices,
      });
    } catch (error) {
      logger.error('Error retrieving devices:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve devices',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /api/sensors/devices/{deviceId}:
 *   get:
 *     summary: Get specific device information
 *     tags: [Sensors]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device information retrieved successfully
 *       404:
 *         description: Device not found
 *       401:
 *         description: Unauthorized - invalid API key
 *       500:
 *         description: Internal server error
 */
router.get(
  '/devices/:deviceId',
  authenticateToken,
  deviceIdValidation,
  validateRequest,
  async (req, res) => {
    try {
      const device = await SensorController.getDeviceById(req.params.deviceId);
      
      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found',
        });
      }

      res.json({
        success: true,
        data: device,
      });
    } catch (error) {
      logger.error('Error retrieving device:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve device',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /api/sensors/devices/{deviceId}/status:
 *   put:
 *     summary: Update device status
 *     tags: [Sensors]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *                 example: "maintenance"
 *               notes:
 *                 type: string
 *                 example: "Device under maintenance for calibration"
 *     responses:
 *       200:
 *         description: Device status updated successfully
 *       404:
 *         description: Device not found
 *       401:
 *         description: Unauthorized - invalid API key
 *       500:
 *         description: Internal server error
 */
router.put(
  '/devices/:deviceId/status',
  authenticateToken,
  authorizeRoles(['admin', 'technician']),
  deviceIdValidation,
  [
    body('status').isIn(['active', 'inactive', 'maintenance']).withMessage('Invalid status'),
    body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes must be a string with max 500 characters'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const device = await SensorController.updateDeviceStatus(
        req.params.deviceId,
        req.body.status,
        req.body.notes
      );
      
      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found',
        });
      }

      logger.info('Device status updated', {
        deviceId: req.params.deviceId,
        status: req.body.status,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        message: 'Device status updated successfully',
        data: device,
      });
    } catch (error) {
      logger.error('Error updating device status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update device status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /api/sensors/analytics:
 *   get:
 *     summary: Get sensor data analytics
 *     tags: [Sensors]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *           default: day
 *         description: Analytics period
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *         description: Filter by device ID
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalReadings:
 *                           type: integer
 *                           example: 1440
 *                         averagepH:
 *                           type: number
 *                           example: 7.2
 *                         averageTurbidity:
 *                           type: number
 *                           example: 15.5
 *                         averageTemperature:
 *                           type: number
 *                           example: 25.3
 *                         averageTds:
 *                           type: number
 *                           example: 120.0
 *                     trends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           pH:
 *                             type: number
 *                           turbidity:
 *                             type: number
 *                           temperature:
 *                             type: number
 *                           tds:
 *                             type: number
 *       401:
 *         description: Unauthorized - invalid API key
 *       500:
 *         description: Internal server error
 */
router.get(
  '/analytics',
  authenticateToken,
  async (req, res) => {
    try {
      const analytics = await SensorController.getAnalytics(req.query);
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error retrieving analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

module.exports = router;
