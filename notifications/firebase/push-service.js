/**
 * Firebase Push Notification Service
 * Handles push notifications for mobile apps and web clients
 */

const admin = require('firebase-admin');
const config = require('../../backend/src/config');
const logger = require('../../backend/src/utils/logger');

class FirebasePushService {
    constructor() {
        this.app = null;
        this.isInitialized = false;
        this.messageTemplates = {
            outbreak_alert: {
                high: {
                    title: '🚨 HIGH RISK ALERT',
                    body: 'Outbreak prediction indicates HIGH risk level. Immediate attention required.',
                    data: {
                        type: 'outbreak_alert',
                        priority: 'high',
                        action: 'view_alert'
                    }
                },
                medium: {
                    title: '⚠️ MEDIUM RISK ALERT',
                    body: 'Outbreak prediction indicates MEDIUM risk level. Please monitor your health.',
                    data: {
                        type: 'outbreak_alert',
                        priority: 'medium',
                        action: 'view_alert'
                    }
                },
                low: {
                    title: 'ℹ️ LOW RISK ALERT',
                    body: 'Outbreak prediction indicates LOW risk level. Continue following health guidelines.',
                    data: {
                        type: 'outbreak_alert',
                        priority: 'low',
                        action: 'view_alert'
                    }
                }
            },
            health_report_confirmation: {
                title: '✅ Health Report Received',
                body: 'Thank you for reporting your symptoms. Your report helps with outbreak monitoring.',
                data: {
                    type: 'health_report_confirmation',
                    action: 'view_report'
                }
            },
            sensor_alert: {
                title: '🔧 Sensor Alert',
                body: 'Water quality sensor has detected unusual readings. Investigation recommended.',
                data: {
                    type: 'sensor_alert',
                    action: 'view_sensor_data'
                }
            },
            system_alert: {
                title: '⚠️ System Alert',
                body: 'System notification: {message}',
                data: {
                    type: 'system_alert',
                    action: 'view_system_status'
                }
            },
            reminder: {
                title: '📱 Health Check Reminder',
                body: 'Please report any symptoms you may be experiencing.',
                data: {
                    type: 'reminder',
                    action: 'report_symptoms'
                }
            }
        };
    }

    async initialize() {
        try {
            if (!config.firebase.projectId || !config.firebase.privateKey || !config.firebase.clientEmail) {
                throw new Error('Firebase credentials not configured');
            }

            // Initialize Firebase Admin SDK
            const serviceAccount = {
                projectId: config.firebase.projectId,
                privateKey: config.firebase.privateKey,
                clientEmail: config.firebase.clientEmail
            };

            this.app = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: config.firebase.databaseURL
            });

            this.isInitialized = true;
            logger.info('Firebase Push service initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize Firebase Push service:', error);
            throw error;
        }
    }

    async sendPushNotification(token, message, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Firebase Push service not initialized');
        }

        try {
            const messagePayload = {
                token: token,
                notification: {
                    title: message.title,
                    body: message.body
                },
                data: {
                    ...message.data,
                    timestamp: new Date().toISOString(),
                    ...options.data
                },
                android: {
                    priority: 'high',
                    notification: {
                        icon: 'ic_notification',
                        color: '#4CAF50',
                        sound: 'default',
                        ...options.android
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            alert: {
                                title: message.title,
                                body: message.body
                            },
                            badge: 1,
                            sound: 'default',
                            ...options.apns
                        }
                    }
                },
                webpush: {
                    notification: {
                        title: message.title,
                        body: message.body,
                        icon: '/icons/icon-192x192.png',
                        badge: '/icons/badge-72x72.png',
                        ...options.webpush
                    }
                }
            };

            const response = await admin.messaging().send(messagePayload);
            
            logger.info('Push notification sent successfully', {
                token: token.substring(0, 20) + '...',
                messageId: response,
                title: message.title
            });

            return {
                success: true,
                messageId: response,
                token: token
            };

        } catch (error) {
            logger.error('Failed to send push notification:', error);
            return {
                success: false,
                error: error.message,
                token: token
            };
        }
    }

    async sendOutbreakAlert(tokens, alertData) {
        const {
            risk_level,
            confidence,
            contributing_factors = [],
            recommendations = [],
            location,
            timestamp,
            alert_id
        } = alertData;

        const template = this.messageTemplates.outbreak_alert[risk_level];
        if (!template) {
            throw new Error(`No template found for risk level: ${risk_level}`);
        }

        const message = {
            ...template,
            data: {
                ...template.data,
                alert_id: alert_id,
                risk_level: risk_level,
                confidence: confidence.toString(),
                contributing_factors: JSON.stringify(contributing_factors),
                recommendations: JSON.stringify(recommendations),
                location: location ? JSON.stringify(location) : null,
                timestamp: timestamp
            }
        };

        return await this.sendToMultipleTokens(tokens, message);
    }

    async sendHealthReportConfirmation(tokens, reportData) {
        const { report_id, timestamp } = reportData;

        const message = {
            ...this.messageTemplates.health_report_confirmation,
            data: {
                ...this.messageTemplates.health_report_confirmation.data,
                report_id: report_id,
                timestamp: timestamp
            }
        };

        return await this.sendToMultipleTokens(tokens, message);
    }

    async sendSensorAlert(tokens, sensorData) {
        const {
            device_id,
            ph_value,
            turbidity_value,
            temperature_value,
            tds_value
        } = sensorData;

        const message = {
            ...this.messageTemplates.sensor_alert,
            data: {
                ...this.messageTemplates.sensor_alert.data,
                device_id: device_id,
                ph_value: ph_value?.toString() || 'N/A',
                turbidity_value: turbidity_value?.toString() || 'N/A',
                temperature_value: temperature_value?.toString() || 'N/A',
                tds_value: tds_value?.toString() || 'N/A'
            }
        };

        return await this.sendToMultipleTokens(tokens, message);
    }

    async sendSystemAlert(tokens, message, timestamp = new Date()) {
        const alertMessage = {
            ...this.messageTemplates.system_alert,
            body: this.messageTemplates.system_alert.body.replace('{message}', message),
            data: {
                ...this.messageTemplates.system_alert.data,
                message: message,
                timestamp: timestamp.toISOString()
            }
        };

        return await this.sendToMultipleTokens(tokens, alertMessage);
    }

    async sendReminder(tokens, reminderData = {}) {
        const message = {
            ...this.messageTemplates.reminder,
            data: {
                ...this.messageTemplates.reminder.data,
                ...reminderData
            }
        };

        return await this.sendToMultipleTokens(tokens, message);
    }

    async sendToMultipleTokens(tokens, message, options = {}) {
        if (!Array.isArray(tokens) || tokens.length === 0) {
            throw new Error('Tokens array is required and cannot be empty');
        }

        const results = [];
        const batchSize = 500; // Firebase allows up to 500 tokens per batch

        for (let i = 0; i < tokens.length; i += batchSize) {
            const batch = tokens.slice(i, i + batchSize);
            
            try {
                const response = await admin.messaging().sendMulticast({
                    tokens: batch,
                    notification: {
                        title: message.title,
                        body: message.body
                    },
                    data: {
                        ...message.data,
                        timestamp: new Date().toISOString(),
                        ...options.data
                    },
                    android: {
                        priority: 'high',
                        notification: {
                            icon: 'ic_notification',
                            color: '#4CAF50',
                            sound: 'default',
                            ...options.android
                        }
                    },
                    apns: {
                        payload: {
                            aps: {
                                alert: {
                                    title: message.title,
                                    body: message.body
                                },
                                badge: 1,
                                sound: 'default',
                                ...options.apns
                            }
                        }
                    },
                    webpush: {
                        notification: {
                            title: message.title,
                            body: message.body,
                            icon: '/icons/icon-192x192.png',
                            badge: '/icons/badge-72x72.png',
                            ...options.webpush
                        }
                    }
                });

                // Process individual results
                batch.forEach((token, index) => {
                    const result = {
                        token: token,
                        success: response.responses[index].success,
                        messageId: response.responses[index].messageId,
                        error: response.responses[index].error
                    };
                    results.push(result);
                });

                logger.info('Batch push notification sent', {
                    batchSize: batch.length,
                    successCount: response.successCount,
                    failureCount: response.failureCount
                });

            } catch (error) {
                logger.error('Failed to send batch push notification:', error);
                
                // Add failed results for this batch
                batch.forEach(token => {
                    results.push({
                        token: token,
                        success: false,
                        error: error.message
                    });
                });
            }
        }

        return results;
    }

    async sendToTopic(topic, message, options = {}) {
        try {
            const response = await admin.messaging().send({
                topic: topic,
                notification: {
                    title: message.title,
                    body: message.body
                },
                data: {
                    ...message.data,
                    timestamp: new Date().toISOString(),
                    ...options.data
                },
                android: {
                    priority: 'high',
                    notification: {
                        icon: 'ic_notification',
                        color: '#4CAF50',
                        sound: 'default',
                        ...options.android
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            alert: {
                                title: message.title,
                                body: message.body
                            },
                            badge: 1,
                            sound: 'default',
                            ...options.apns
                        }
                    }
                },
                webpush: {
                    notification: {
                        title: message.title,
                        body: message.body,
                        icon: '/icons/icon-192x192.png',
                        badge: '/icons/badge-72x72.png',
                        ...options.webpush
                    }
                }
            });

            logger.info('Topic push notification sent successfully', {
                topic: topic,
                messageId: response,
                title: message.title
            });

            return {
                success: true,
                messageId: response,
                topic: topic
            };

        } catch (error) {
            logger.error('Failed to send topic push notification:', error);
            return {
                success: false,
                error: error.message,
                topic: topic
            };
        }
    }

    async subscribeToTopic(tokens, topic) {
        try {
            const response = await admin.messaging().subscribeToTopic(tokens, topic);
            
            logger.info('Tokens subscribed to topic', {
                topic: topic,
                successCount: response.successCount,
                failureCount: response.failureCount
            });

            return {
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount,
                errors: response.errors
            };

        } catch (error) {
            logger.error('Failed to subscribe tokens to topic:', error);
            throw error;
        }
    }

    async unsubscribeFromTopic(tokens, topic) {
        try {
            const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
            
            logger.info('Tokens unsubscribed from topic', {
                topic: topic,
                successCount: response.successCount,
                failureCount: response.failureCount
            });

            return {
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount,
                errors: response.errors
            };

        } catch (error) {
            logger.error('Failed to unsubscribe tokens from topic:', error);
            throw error;
        }
    }

    async validateToken(token) {
        try {
            // Try to send a test message to validate the token
            await admin.messaging().send({
                token: token,
                notification: {
                    title: 'Test',
                    body: 'This is a test message'
                },
                data: {
                    test: 'true'
                }
            }, true); // dry run

            return { valid: true };
        } catch (error) {
            if (error.code === 'messaging/invalid-registration-token' || 
                error.code === 'messaging/registration-token-not-registered') {
                return { valid: false, error: 'Invalid or unregistered token' };
            }
            throw error;
        }
    }

    async getTopicSubscribers(topic) {
        try {
            // Note: Firebase doesn't provide a direct way to get topic subscribers
            // This would require maintaining a custom database of topic subscriptions
            logger.warn('getTopicSubscribers not implemented - requires custom database');
            return [];
        } catch (error) {
            logger.error('Failed to get topic subscribers:', error);
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
    async cleanup() {
        if (this.app) {
            await this.app.delete();
            this.app = null;
        }
        this.isInitialized = false;
        logger.info('Firebase Push service cleaned up');
    }
}

module.exports = FirebasePushService;
