# Smart Health Monitoring & Outbreak Prediction Platform

A comprehensive IoT-based system for monitoring water quality, collecting health symptoms, and predicting disease outbreaks using AI/ML.

## 🏗 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   IoT Sensors   │    │   Mobile App    │    │   Health Data   │
│   (ESP32/Arduino│    │   (Flutter)     │    │   Collection    │
│   pH, Turbidity,│    │   Symptoms      │    │                 │
│   Temperature)  │    │   Reporting     │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │      Backend API          │
                    │   (Node.js/Express)       │
                    │   + PostgreSQL/Supabase   │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │      AI/ML Service        │
                    │   (Python + scikit-learn) │
                    │   Outbreak Prediction     │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │      n8n Automation       │
                    │   Workflow Orchestration  │
                    │   Alert Triggers          │
                    └─────────────┬─────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
┌─────────┴─────────┐    ┌─────────┴─────────┐    ┌─────────┴─────────┐
│   Dashboard       │    │   Notifications   │    │   Monitoring      │
│   (Grafana +      │    │   (Twilio +       │    │   (Prometheus +   │
│   Leaflet.js +    │    │   Firebase Push)  │    │   Grafana)        │
│   D3.js/Plotly)   │    │                   │    │                   │
└───────────────────┘    └───────────────────┘    └───────────────────┘
```

## 📁 Project Structure

```
smart-health-platform/
├── iot-sensors/                 # Arduino/ESP32 sensor code
│   ├── water_quality_sensor/
│   └── README.md
├── mobile-app/                  # Flutter mobile application
│   ├── lib/
│   ├── android/
│   ├── ios/
│   └── pubspec.yaml
├── backend/                     # Node.js/Express backend
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── ai-service/                  # Python AI/ML service
│   ├── models/
│   ├── training/
│   ├── requirements.txt
│   └── Dockerfile
├── n8n-workflows/              # n8n automation workflows
│   └── workflows/
├── dashboard/                   # Grafana dashboards and configs
│   ├── dashboards/
│   ├── datasources/
│   └── provisioning/
├── notifications/              # Notification service
│   ├── twilio/
│   └── firebase/
├── monitoring/                 # Monitoring and logging
│   ├── prometheus/
│   ├── grafana/
│   └── logging/
├── deployment/                 # Docker and deployment configs
│   ├── docker-compose.yml
│   ├── kubernetes/
│   └── scripts/
└── docs/                      # Documentation
    ├── api/
    ├── setup/
    └── architecture/
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Flutter 3.0+
- Docker & Docker Compose
- Arduino IDE (for IoT development)
- n8n (self-hosted or cloud)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd smart-health-platform
```

### 2. Start with Docker Compose
```bash
cd deployment
docker-compose up -d
```

### 3. Access Services
- Backend API: http://localhost:3000
- AI Service: http://localhost:8000
- Mobile App: http://localhost:8080
- Dashboard: http://localhost:3001
- n8n: http://localhost:5678
- Grafana: http://localhost:3002

## 📋 Module Overview

### 1. IoT Sensors (`/iot-sensors`)
- ESP32/Arduino code for water quality monitoring
- Sensors: pH, turbidity, temperature, TDS
- WiFi connectivity with MQTT/HTTP data transmission
- Error handling and retry mechanisms

### 2. Mobile App (`/mobile-app`)
- Flutter cross-platform application
- Health symptom reporting
- Offline data storage and sync
- Push notifications
- Multi-language support

### 3. Backend API (`/backend`)
- Node.js/Express REST API
- PostgreSQL database with Supabase
- JWT authentication
- Data validation and error handling
- Real-time WebSocket connections

### 4. AI/ML Service (`/ai-service`)
- Python-based outbreak prediction
- scikit-learn models (RandomForest, GradientBoosting)
- Real-time inference API
- Model training and evaluation scripts

### 5. n8n Workflows (`/n8n-workflows`)
- Automated data processing
- AI model integration
- Alert triggering
- Dashboard updates

### 6. Dashboard (`/dashboard`)
- Grafana-based visualization
- Interactive maps with Leaflet.js
- Real-time charts with D3.js/Plotly
- Outbreak hotspot visualization

### 7. Notifications (`/notifications`)
- Twilio SMS integration
- Firebase push notifications
- Multi-language support
- Alert escalation

### 8. Monitoring (`/monitoring`)
- Prometheus metrics collection
- Grafana monitoring dashboards
- Error logging with Sentry
- Performance monitoring

## 🔧 Configuration

### Environment Variables
Create `.env` files in each module directory:

```bash
# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/health_monitoring
JWT_SECRET=your-jwt-secret
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key

# AI Service (.env)
MODEL_PATH=./models/outbreak_model.pkl
API_PORT=8000

# Mobile App (flutter_dotenv)
FIREBASE_API_KEY=your-firebase-key
TWILIO_ACCOUNT_SID=your-twilio-sid
```

## 📊 Data Flow

1. **Data Collection**: IoT sensors collect water quality data
2. **Mobile Reporting**: Citizens report health symptoms via mobile app
3. **Data Processing**: Backend processes and stores data in PostgreSQL
4. **AI Analysis**: AI service analyzes data and predicts outbreak risk
5. **Automation**: n8n workflows trigger based on AI predictions
6. **Notifications**: Alerts sent via SMS and push notifications
7. **Visualization**: Dashboard displays real-time data and trends

## 🧪 Testing

Each module includes comprehensive tests:
- Unit tests for individual components
- Integration tests for API endpoints
- End-to-end tests for complete workflows
- Load testing for performance validation

## 📈 Deployment

### Development
```bash
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Deployment
- **Render**: Backend and AI service
- **Supabase**: Database and authentication
- **Railway**: n8n workflows
- **Fly.io**: Mobile app backend

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Check the documentation in `/docs`
- Contact the development team

---

**Built with ❤️ for public health monitoring and outbreak prevention**
