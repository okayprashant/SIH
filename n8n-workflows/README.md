# n8n Automation Workflows

This directory contains n8n automation workflows for the Smart Health Monitoring Platform. These workflows handle data processing, AI predictions, alert generation, and notification delivery.

## 📁 Structure

```
n8n-workflows/
├── workflows/
│   ├── outbreak-prediction-workflow.json    # Main outbreak prediction workflow
│   ├── health-report-processing.json        # Health report processing workflow
│   ├── sensor-data-validation.json          # Sensor data validation workflow
│   └── notification-delivery.json           # Notification delivery workflow
├── credentials/
│   ├── backend-api-key.json                # Backend API credentials
│   ├── twilio-credentials.json              # Twilio SMS credentials
│   ├── firebase-credentials.json            # Firebase push notification credentials
│   └── grafana-api-key.json                # Grafana dashboard credentials
└── README.md                               # This file
```

## 🔄 Workflows Overview

### 1. Outbreak Prediction Workflow
**File**: `outbreak-prediction-workflow.json`
**Trigger**: Every 5 minutes (cron)
**Purpose**: Predict outbreak risk and trigger alerts

**Flow**:
1. **Cron Trigger** - Runs every 5 minutes
2. **Fetch Sensor Data** - Gets latest water quality data
3. **Fetch Health Reports** - Gets recent health symptom reports
4. **Data Validation** - Checks if data is available and valid
5. **Prepare AI Data** - Formats data for AI prediction
6. **Call AI Prediction** - Sends data to AI service for analysis
7. **Check Risk Level** - Determines if risk is medium or high
8. **Create Alert** - Creates alert record in database
9. **Check High Risk** - Determines if immediate action needed
10. **Send Notifications** - Sends SMS and push notifications
11. **Update Dashboard** - Updates Grafana dashboard with new data
12. **Log Execution** - Logs workflow execution details

### 2. Health Report Processing Workflow
**File**: `health-report-processing.json`
**Trigger**: Webhook (when new health report submitted)
**Purpose**: Process and validate health reports

**Flow**:
1. **Webhook Trigger** - Receives new health report
2. **Validate Report** - Validates report data and format
3. **Geocode Location** - Converts location to coordinates
4. **Calculate Risk Score** - Calculates individual risk score
5. **Store Report** - Saves report to database
6. **Trigger Analysis** - Triggers outbreak prediction if needed
7. **Send Confirmation** - Sends confirmation to user

### 3. Sensor Data Validation Workflow
**File**: `sensor-data-validation.json`
**Trigger**: Webhook (when new sensor data received)
**Purpose**: Validate and process sensor data

**Flow**:
1. **Webhook Trigger** - Receives new sensor data
2. **Validate Data** - Checks data quality and ranges
3. **Detect Anomalies** - Identifies unusual readings
4. **Store Data** - Saves valid data to database
5. **Update Device Status** - Updates device health status
6. **Trigger Calibration** - Suggests calibration if needed

### 4. Notification Delivery Workflow
**File**: `notification-delivery.json`
**Trigger**: Webhook (when alert created)
**Purpose**: Deliver notifications to users and health workers

**Flow**:
1. **Webhook Trigger** - Receives alert notification request
2. **Determine Recipients** - Identifies who should receive notification
3. **Format Messages** - Creates appropriate message content
4. **Send SMS** - Sends SMS via Twilio
5. **Send Push** - Sends push notification via Firebase
6. **Send Email** - Sends email notification
7. **Update Status** - Updates notification delivery status

## ⚙️ Setup Instructions

### 1. Install n8n
```bash
# Using npm
npm install n8n -g

# Using Docker
docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n

# Using Docker Compose (recommended)
docker-compose up -d n8n
```

### 2. Access n8n Interface
- Open browser and go to `http://localhost:5678`
- Create admin account on first visit
- Set up credentials for external services

### 3. Import Workflows
1. Go to **Workflows** section
2. Click **Import from File**
3. Select workflow JSON files from this directory
4. Configure credentials for each workflow

### 4. Configure Credentials
Set up the following credentials in n8n:

#### Backend API Key
- **Type**: HTTP Header Auth
- **Name**: Backend API Key
- **Header Name**: X-API-Key
- **Header Value**: Your backend API key

#### Twilio Credentials
- **Type**: Twilio API
- **Name**: Twilio API
- **Account SID**: Your Twilio Account SID
- **Auth Token**: Your Twilio Auth Token
- **Phone Number**: Your Twilio phone number

#### Firebase Credentials
- **Type**: HTTP Header Auth
- **Name**: Firebase API Key
- **Header Name**: Authorization
- **Header Value**: Bearer your-firebase-token

#### Grafana API Key
- **Type**: HTTP Header Auth
- **Name**: Grafana API Key
- **Header Name**: Authorization
- **Header Value**: Bearer your-grafana-api-key

## 🔧 Configuration

### Environment Variables
Create `.env` file in n8n directory:

```bash
# n8n Configuration
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-password
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http

# Database (if using external DB)
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=health_monitoring
DB_POSTGRESDB_USER=health_user
DB_POSTGRESDB_PASSWORD=health_password

# External Services
BACKEND_URL=http://backend:3000
AI_SERVICE_URL=http://ai-service:8000
GRAFANA_URL=http://grafana:3000
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
FIREBASE_PROJECT_ID=your-firebase-project
```

### Workflow Settings
Each workflow can be configured with:

- **Execution Frequency**: How often the workflow runs
- **Retry Settings**: Number of retries for failed operations
- **Timeout Settings**: Maximum execution time
- **Error Handling**: How to handle errors and failures

## 📊 Monitoring

### Execution Logs
- View workflow execution history in n8n interface
- Check execution status and error messages
- Monitor performance metrics

### Prometheus Metrics
n8n exposes metrics at `/metrics` endpoint:
- `n8n_workflow_executions_total`
- `n8n_workflow_execution_duration_seconds`
- `n8n_workflow_execution_errors_total`

### Grafana Dashboard
Import the n8n dashboard to monitor:
- Workflow execution rates
- Success/failure rates
- Execution duration
- Error patterns

## 🚨 Alert Configuration

### Risk Level Thresholds
Configure risk level thresholds in workflows:

```javascript
const RISK_THRESHOLDS = {
  LOW: 0.3,
  MEDIUM: 0.7,
  HIGH: 0.9
};
```

### Notification Rules
Set up notification rules based on:

- **Risk Level**: Different notifications for low/medium/high risk
- **User Role**: Different messages for citizens vs health workers
- **Location**: Location-specific alerts and recommendations
- **Time**: Time-based notification preferences

### Escalation Policies
Configure escalation for critical alerts:

1. **Level 1**: Immediate SMS to health workers
2. **Level 2**: Push notification to all users in area
3. **Level 3**: Email to health authorities
4. **Level 4**: Public health alert broadcast

## 🔄 Workflow Customization

### Adding New Workflows
1. Create new workflow in n8n interface
2. Add required nodes and connections
3. Configure credentials and settings
4. Test workflow with sample data
5. Export workflow as JSON
6. Add to this repository

### Modifying Existing Workflows
1. Import workflow from JSON file
2. Make required modifications
3. Test changes thoroughly
4. Export updated workflow
5. Update repository

### Error Handling
Each workflow includes comprehensive error handling:

- **Retry Logic**: Automatic retry for transient failures
- **Fallback Actions**: Alternative actions if primary fails
- **Error Notifications**: Alerts when workflows fail
- **Logging**: Detailed logs for debugging

## 🧪 Testing

### Test Workflows
1. Use n8n's test mode to run workflows manually
2. Create test data that triggers different scenarios
3. Verify all notification channels work correctly
4. Test error handling and recovery

### Load Testing
1. Use tools like Artillery or k6 to simulate load
2. Monitor workflow performance under load
3. Identify bottlenecks and optimize
4. Test system recovery after failures

## 📈 Performance Optimization

### Workflow Optimization
- Use parallel execution where possible
- Implement efficient data processing
- Cache frequently used data
- Optimize API calls and database queries

### Resource Management
- Monitor CPU and memory usage
- Scale n8n instances as needed
- Use connection pooling for databases
- Implement rate limiting for external APIs

## 🔒 Security

### Access Control
- Use strong authentication for n8n
- Limit access to workflow management
- Encrypt sensitive credentials
- Regular security updates

### Data Protection
- Encrypt sensitive data in workflows
- Use secure connections (HTTPS)
- Implement data retention policies
- Regular security audits

## 📞 Support

### Troubleshooting
1. Check n8n execution logs
2. Verify credential configuration
3. Test individual workflow nodes
4. Check external service status

### Common Issues
- **Workflow not triggering**: Check cron schedule or webhook URL
- **API calls failing**: Verify credentials and endpoints
- **Notifications not sending**: Check service credentials and quotas
- **Data not processing**: Verify data format and validation rules

For additional support:
- Check n8n documentation: https://docs.n8n.io
- Create issue in repository
- Contact development team

---

**Note**: These workflows are designed for the Smart Health Monitoring Platform. Customize them based on your specific requirements and infrastructure setup.
