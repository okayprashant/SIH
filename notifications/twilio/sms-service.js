/**
 * Twilio SMS Notification Service
 * Handles SMS notifications for health alerts and outbreak warnings
 */

const twilio = require('twilio');
const config = require('../../backend/src/config');
const logger = require('../../backend/src/utils/logger');

class TwilioSMSService {
    constructor() {
        this.client = null;
        this.isInitialized = false;
        this.rateLimits = new Map(); // Track rate limits per phone number
        this.messageTemplates = {
            outbreak_alert: {
                high: `🚨 HIGH RISK ALERT 🚨

Outbreak prediction indicates HIGH risk level with {confidence}% confidence.

Key factors:
{contributing_factors}

Immediate actions:
{recommendations}

Location: {location}
Time: {timestamp}

Stay safe and follow health guidelines.`,
                medium: `⚠️ MEDIUM RISK ALERT ⚠️

Outbreak prediction indicates MEDIUM risk level with {confidence}% confidence.

Key factors:
{contributing_factors}

Recommended actions:
{recommendations}

Location: {location}
Time: {timestamp}

Please monitor your health and report any symptoms.`,
                low: `ℹ️ LOW RISK ALERT ℹ️

Outbreak prediction indicates LOW risk level with {confidence}% confidence.

Location: {location}
Time: {timestamp}

Continue following health guidelines.`
            },
            health_report_confirmation: `✅ Health Report Received

Thank you for reporting your symptoms. Your report has been received and will help with outbreak monitoring.

Report ID: {report_id}
Time: {timestamp}

If your symptoms worsen, please contact a healthcare provider immediately.`,
            sensor_alert: `🔧 Sensor Alert

Water quality sensor {device_id} has detected unusual readings:

{pH: pH Level: {ph_value}
Turbidity: {turbidity_value}
Temperature: {temperature_value}°C
TDS: {tds_value}

Please investigate water quality in this area.`,
            system_alert: `⚠️ System Alert

{message}

Time: {timestamp}

Please check the system status.`
        };
    }

    async initialize() {
        try {
            if (!config.twilio.accountSid || !config.twilio.authToken) {
                throw new Error('Twilio credentials not configured');
            }

            this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
            
            // Verify credentials
            await this.client.api.accounts(config.twilio.accountSid).fetch();
            
            this.isInitialized = true;
            logger.info('Twilio SMS service initialized successfully');
            
        } catch (error) {
            logger.error('Failed to initialize Twilio SMS service:', error);
            throw error;
        }
    }

    async sendSMS(phoneNumber, message, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Twilio SMS service not initialized');
        }

        try {
            // Validate phone number
            if (!this.isValidPhoneNumber(phoneNumber)) {
                throw new Error('Invalid phone number format');
            }

            // Check rate limits
            if (this.isRateLimited(phoneNumber)) {
                logger.warn(`Rate limit exceeded for phone number: ${phoneNumber}`);
                return { success: false, error: 'Rate limit exceeded' };
            }

            // Prepare message options
            const messageOptions = {
                body: message,
                from: config.twilio.phoneNumber,
                to: phoneNumber,
                ...options
            };

            // Send SMS
            const result = await this.client.messages.create(messageOptions);
            
            // Update rate limit tracking
            this.updateRateLimit(phoneNumber);
            
            logger.info('SMS sent successfully', {
                to: phoneNumber,
                messageSid: result.sid,
                status: result.status
            });

            return {
                success: true,
                messageSid: result.sid,
                status: result.status,
                to: phoneNumber
            };

        } catch (error) {
            logger.error('Failed to send SMS:', error);
            return {
                success: false,
                error: error.message,
                to: phoneNumber
            };
        }
    }

    async sendOutbreakAlert(phoneNumber, alertData) {
        const {
            risk_level,
            confidence,
            contributing_factors = [],
            recommendations = [],
            location,
            timestamp
        } = alertData;

        const template = this.messageTemplates.outbreak_alert[risk_level];
        if (!template) {
            throw new Error(`No template found for risk level: ${risk_level}`);
        }

        const message = template
            .replace('{confidence}', Math.round(confidence * 100))
            .replace('{contributing_factors}', contributing_factors.join('\n'))
            .replace('{recommendations}', recommendations.slice(0, 3).join('\n'))
            .replace('{location}', location ? `${location.latitude}, ${location.longitude}` : 'Unknown')
            .replace('{timestamp}', new Date(timestamp).toLocaleString());

        return await this.sendSMS(phoneNumber, message, {
            statusCallback: `${config.server.baseUrl}/api/notifications/sms/status`
        });
    }

    async sendHealthReportConfirmation(phoneNumber, reportData) {
        const { report_id, timestamp } = reportData;

        const message = this.messageTemplates.health_report_confirmation
            .replace('{report_id}', report_id)
            .replace('{timestamp}', new Date(timestamp).toLocaleString());

        return await this.sendSMS(phoneNumber, message);
    }

    async sendSensorAlert(phoneNumber, sensorData) {
        const {
            device_id,
            ph_value,
            turbidity_value,
            temperature_value,
            tds_value
        } = sensorData;

        const message = this.messageTemplates.sensor_alert
            .replace('{device_id}', device_id)
            .replace('{ph_value}', ph_value || 'N/A')
            .replace('{turbidity_value}', turbidity_value || 'N/A')
            .replace('{temperature_value}', temperature_value || 'N/A')
            .replace('{tds_value}', tds_value || 'N/A');

        return await this.sendSMS(phoneNumber, message);
    }

    async sendSystemAlert(phoneNumber, message, timestamp = new Date()) {
        const alertMessage = this.messageTemplates.system_alert
            .replace('{message}', message)
            .replace('{timestamp}', timestamp.toLocaleString());

        return await this.sendSMS(phoneNumber, alertMessage);
    }

    async sendBulkSMS(recipients, message, options = {}) {
        const results = [];
        const batchSize = 10; // Process in batches to avoid overwhelming Twilio

        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (recipient) => {
                try {
                    const result = await this.sendSMS(recipient.phone, message, {
                        ...options,
                        // Add recipient-specific data
                        customData: recipient.customData
                    });
                    return { recipient, result };
                } catch (error) {
                    logger.error(`Failed to send SMS to ${recipient.phone}:`, error);
                    return { recipient, result: { success: false, error: error.message } };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Add delay between batches to respect rate limits
            if (i + batchSize < recipients.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return results;
    }

    async sendBulkOutbreakAlert(recipients, alertData) {
        const results = [];
        const batchSize = 5; // Smaller batch size for complex messages

        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (recipient) => {
                try {
                    const result = await this.sendOutbreakAlert(recipient.phone, alertData);
                    return { recipient, result };
                } catch (error) {
                    logger.error(`Failed to send outbreak alert to ${recipient.phone}:`, error);
                    return { recipient, result: { success: false, error: error.message } };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Add delay between batches
            if (i + batchSize < recipients.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        return results;
    }

    async getMessageStatus(messageSid) {
        try {
            const message = await this.client.messages(messageSid).fetch();
            return {
                sid: message.sid,
                status: message.status,
                errorCode: message.errorCode,
                errorMessage: message.errorMessage,
                dateCreated: message.dateCreated,
                dateUpdated: message.dateUpdated,
                dateSent: message.dateSent
            };
        } catch (error) {
            logger.error('Failed to get message status:', error);
            throw error;
        }
    }

    async getAccountUsage() {
        try {
            const account = await this.client.api.accounts(config.twilio.accountSid).fetch();
            const usage = await this.client.usage.records.list({
                category: 'sms',
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                endDate: new Date()
            });

            return {
                accountSid: account.sid,
                friendlyName: account.friendlyName,
                status: account.status,
                balance: account.balance,
                currency: account.currency,
                usage: usage.map(record => ({
                    category: record.category,
                    count: record.count,
                    countUnit: record.countUnit,
                    startDate: record.startDate,
                    endDate: record.endDate
                }))
            };
        } catch (error) {
            logger.error('Failed to get account usage:', error);
            throw error;
        }
    }

    isValidPhoneNumber(phoneNumber) {
        // Basic phone number validation
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phoneNumber);
    }

    isRateLimited(phoneNumber) {
        const now = Date.now();
        const rateLimitWindow = 60 * 1000; // 1 minute
        const maxMessages = 5; // Max 5 messages per minute per number

        if (!this.rateLimits.has(phoneNumber)) {
            this.rateLimits.set(phoneNumber, []);
        }

        const messages = this.rateLimits.get(phoneNumber);
        
        // Remove old messages outside the rate limit window
        const recentMessages = messages.filter(timestamp => now - timestamp < rateLimitWindow);
        this.rateLimits.set(phoneNumber, recentMessages);

        return recentMessages.length >= maxMessages;
    }

    updateRateLimit(phoneNumber) {
        if (!this.rateLimits.has(phoneNumber)) {
            this.rateLimits.set(phoneNumber, []);
        }

        const messages = this.rateLimits.get(phoneNumber);
        messages.push(Date.now());
        this.rateLimits.set(phoneNumber, messages);
    }

    async handleStatusCallback(statusData) {
        try {
            const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = statusData;
            
            logger.info('SMS status update received', {
                messageSid: MessageSid,
                status: MessageStatus,
                errorCode: ErrorCode,
                errorMessage: ErrorMessage
            });

            // Update message status in database
            // This would typically update a messages table with the status
            // await this.updateMessageStatus(MessageSid, MessageStatus, ErrorCode, ErrorMessage);

            return { success: true };
        } catch (error) {
            logger.error('Failed to handle status callback:', error);
            throw error;
        }
    }

    // Template management
    addMessageTemplate(templateName, template) {
        this.messageTemplates[templateName] = template;
    }

    getMessageTemplate(templateName) {
        return this.messageTemplates[templateName];
    }

    listMessageTemplates() {
        return Object.keys(this.messageTemplates);
    }

    // Cleanup methods
    clearRateLimits() {
        this.rateLimits.clear();
    }

    async cleanup() {
        this.clearRateLimits();
        this.isInitialized = false;
        logger.info('Twilio SMS service cleaned up');
    }
}

module.exports = TwilioSMSService;
