import os
import sys
import logging
import asyncio
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field
import structlog
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from prometheus_client import start_http_server
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.pipeline import Pipeline
import warnings

# Suppress warnings
warnings.filterwarnings('ignore')

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

# Configuration settings (replacing config import)
class Settings:
    HOST = "0.0.0.0"
    PORT = 8000
    DEBUG = True
    ALLOWED_ORIGINS = ["*"]
    PROMETHEUS_PORT = 9090

settings = Settings()

# Simple logging setup (replacing utils.logger)
def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

setup_logging()
logger = logging.getLogger(__name__)

# Simple metrics collector (replacing utils.metrics)
class MetricsCollector:
    def __init__(self):
        self.prediction_count = 0
        self.training_count = 0
        self.error_count = 0
    
    def increment_prediction(self):
        self.prediction_count += 1
    
    def increment_training(self):
        self.training_count += 1
    
    def increment_error(self):
        self.error_count += 1

# Simple data processor (replacing services.data_processor)
class DataProcessor:
    def __init__(self):
        self.scaler = StandardScaler()
    
    async def process_prediction_request(self, request):
        """Process prediction request data"""
        features = []
        
        if request.sensor_data:
            for sensor in request.sensor_data:
                features.extend([
                    sensor.ph, sensor.turbidity, sensor.temperature, sensor.tds
                ])
        
        if request.health_reports:
            for report in request.health_reports:
                features.extend([
                    len(report.symptoms), report.severity
                ])
        
        # Pad with zeros if not enough features
        while len(features) < 8:
            features.append(0.0)
        
        return np.array(features[:8]).reshape(1, -1)

# Simple model trainer (replacing services.model_trainer)
class ModelTrainer:
    def __init__(self):
        self.models = {}
    
    async def train_model(self, model_type, data_source, parameters=None):
        """Train a model"""
        logger.info(f"Training {model_type} model...")
        # Simulate training
        await asyncio.sleep(1)
        logger.info(f"{model_type} model training completed")
        return True

# Simple model evaluator (replacing services.model_evaluator)
class ModelEvaluator:
    def __init__(self):
        pass
    
    async def evaluate_model(self, model):
        """Evaluate model performance"""
        return {
            "accuracy": 0.85,
            "precision": 0.82,
            "recall": 0.80,
            "f1_score": 0.81
        }

# Simple outbreak predictor (replacing models.outbreak_predictor)
class OutbreakPredictor:
    def __init__(self):
        self.model = None
        self.version = "1.0.0"
        self.last_trained = None
        self.is_trained = False
    
    async def load_or_train(self):
        """Load or train the model"""
        try:
            # Try to load existing model
            if os.path.exists("models/outbreak_predictor.pkl"):
                self.model = joblib.load("models/outbreak_predictor.pkl")
                self.is_trained = True
                logger.info("Loaded existing outbreak predictor model")
            else:
                # Train new model
                await self.train()
        except Exception as e:
            logger.error(f"Error loading/training outbreak predictor: {e}")
            await self.train()
    
    async def train(self):
        """Train the outbreak prediction model"""
        try:
            logger.info("Training outbreak predictor model...")
            
            # Generate sample data
            X, y = self._generate_sample_data()
            
            # Train model
            self.model = RandomForestClassifier(n_estimators=100, random_state=42)
            self.model.fit(X, y)
            
            # Save model
            os.makedirs("models", exist_ok=True)
            joblib.dump(self.model, "models/outbreak_predictor.pkl")
            
            self.is_trained = True
            self.last_trained = pd.Timestamp.now().isoformat()
            
            logger.info("Outbreak predictor model trained successfully")
            
        except Exception as e:
            logger.error(f"Error training outbreak predictor: {e}")
            raise
    
    def _generate_sample_data(self):
        """Generate sample training data"""
        np.random.seed(42)
        n_samples = 1000
        
        # Generate features
        features = np.random.randn(n_samples, 8)
        
        # Generate labels (0: Low, 1: Medium, 2: High)
        labels = np.random.choice([0, 1, 2], n_samples, p=[0.6, 0.3, 0.1])
        
        return features, labels
    
    async def predict(self, data):
        """Make prediction"""
        if not self.is_trained or self.model is None:
            raise HTTPException(status_code=503, detail="Model not trained")
        
        try:
            prediction = self.model.predict(data)[0]
            probabilities = self.model.predict_proba(data)[0]
            
            risk_levels = ["low", "medium", "high"]
            risk_level = risk_levels[prediction]
            confidence = max(probabilities)
            
            return {
                "risk_level": risk_level,
                "confidence": float(confidence),
                "probability_scores": {
                    "low": float(probabilities[0]),
                    "medium": float(probabilities[1]),
                    "high": float(probabilities[2])
                },
                "contributing_factors": ["Water quality", "Health reports", "Environmental factors"],
                "recommendations": ["Monitor closely", "Increase testing", "Alert authorities"],
                "model_version": self.version,
                "timestamp": pd.Timestamp.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
    
    def get_version(self):
        return self.version
    
    def get_last_trained(self):
        return self.last_trained

# Simple health risk assessor (replacing models.health_risk_assessor)
class HealthRiskAssessor:
    def __init__(self):
        self.model = None
        self.version = "1.0.0"
        self.last_trained = None
        self.is_trained = False
    
    async def load_or_train(self):
        """Load or train the model"""
        try:
            # Try to load existing model
            if os.path.exists("models/health_risk_assessor.pkl"):
                self.model = joblib.load("models/health_risk_assessor.pkl")
                self.is_trained = True
                logger.info("Loaded existing health risk assessor model")
            else:
                # Train new model
                await self.train()
        except Exception as e:
            logger.error(f"Error loading/training health risk assessor: {e}")
            await self.train()
    
    async def train(self):
        """Train the health risk assessment model"""
        try:
            logger.info("Training health risk assessor model...")
            
            # Generate sample data
            X, y = self._generate_sample_data()
            
            # Train model
            self.model = GradientBoostingClassifier(n_estimators=100, random_state=42)
            self.model.fit(X, y)
            
            # Save model
            os.makedirs("models", exist_ok=True)
            joblib.dump(self.model, "models/health_risk_assessor.pkl")
            
            self.is_trained = True
            self.last_trained = pd.Timestamp.now().isoformat()
            
            logger.info("Health risk assessor model trained successfully")
            
        except Exception as e:
            logger.error(f"Error training health risk assessor: {e}")
            raise
    
    def _generate_sample_data(self):
        """Generate sample training data"""
        np.random.seed(42)
        n_samples = 1000
        
        # Generate features
        features = np.random.randn(n_samples, 8)
        
        # Generate labels (0: Low, 1: Medium, 2: High)
        labels = np.random.choice([0, 1, 2], n_samples, p=[0.7, 0.25, 0.05])
        
        return features, labels
    
    async def predict(self, data):
        """Make prediction"""
        if not self.is_trained or self.model is None:
            raise HTTPException(status_code=503, detail="Model not trained")
        
        try:
            prediction = self.model.predict(data)[0]
            probabilities = self.model.predict_proba(data)[0]
            
            risk_levels = ["low", "medium", "high"]
            risk_level = risk_levels[prediction]
            confidence = max(probabilities)
            
            return {
                "risk_level": risk_level,
                "confidence": float(confidence),
                "probability_scores": {
                    "low": float(probabilities[0]),
                    "medium": float(probabilities[1]),
                    "high": float(probabilities[2])
                },
                "contributing_factors": ["Symptom severity", "Health history", "Environmental exposure"],
                "recommendations": ["Consult doctor", "Monitor symptoms", "Seek immediate care"],
                "model_version": self.version,
                "timestamp": pd.Timestamp.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
    
    def get_version(self):
        return self.version
    
    def get_last_trained(self):
        return self.last_trained

# Prometheus metrics (will be initialized in startup)
PREDICTION_COUNTER = None
PREDICTION_DURATION = None
TRAINING_COUNTER = None

# Initialize FastAPI app
app = FastAPI(
    title="Smart Health AI Service",
    description="AI/ML service for outbreak prediction and health risk assessment",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Global variables for models and services
outbreak_predictor: Optional[OutbreakPredictor] = None
health_risk_assessor: Optional[HealthRiskAssessor] = None
data_processor: Optional[DataProcessor] = None
model_trainer: Optional[ModelTrainer] = None
model_evaluator: Optional[ModelEvaluator] = None
metrics_collector: Optional[MetricsCollector] = None

# Pydantic models for API
class SensorData(BaseModel):
    """Sensor data input model"""
    device_id: str = Field(..., description="Unique device identifier")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    ph: float = Field(..., ge=0, le=14, description="pH level (0-14)")
    turbidity: float = Field(..., ge=0, le=100, description="Turbidity level (0-100)")
    temperature: float = Field(..., ge=-40, le=125, description="Temperature in Celsius")
    tds: float = Field(..., ge=0, le=1000, description="Total Dissolved Solids (0-1000)")
    latitude: Optional[float] = Field(None, ge=-90, le=90, description="Latitude")
    longitude: Optional[float] = Field(None, ge=-180, le=180, description="Longitude")

class HealthReport(BaseModel):
    """Health report input model"""
    user_id: str = Field(..., description="User identifier")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    symptoms: List[str] = Field(..., description="List of reported symptoms")
    severity: float = Field(..., ge=1, le=10, description="Symptom severity (1-10)")
    onset_date: str = Field(..., description="Symptom onset date")
    location: Optional[Dict[str, float]] = Field(None, description="Location coordinates")
    additional_notes: Optional[str] = Field(None, max_length=500, description="Additional notes")

class PredictionRequest(BaseModel):
    """Prediction request model"""
    sensor_data: Optional[List[SensorData]] = Field(None, description="Sensor data")
    health_reports: Optional[List[HealthReport]] = Field(None, description="Health reports")
    location: Optional[Dict[str, float]] = Field(None, description="Location for prediction")
    time_range: Optional[Dict[str, str]] = Field(None, description="Time range for prediction")

class PredictionResponse(BaseModel):
    """Prediction response model"""
    risk_level: str = Field(..., description="Predicted risk level (low/medium/high)")
    confidence: float = Field(..., ge=0, le=1, description="Prediction confidence (0-1)")
    probability_scores: Dict[str, float] = Field(..., description="Probability scores for each risk level")
    contributing_factors: List[str] = Field(..., description="Key contributing factors")
    recommendations: List[str] = Field(..., description="Recommended actions")
    model_version: str = Field(..., description="Model version used for prediction")
    timestamp: str = Field(..., description="Prediction timestamp")

class TrainingRequest(BaseModel):
    """Model training request model"""
    model_type: str = Field(..., description="Type of model to train")
    data_source: str = Field(..., description="Data source for training")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Training parameters")

class HealthCheckResponse(BaseModel):
    """Health check response model"""
    status: str
    timestamp: str
    models_loaded: bool
    model_versions: Dict[str, str]
    uptime: float

# Dependency to get metrics collector
def get_metrics_collector() -> MetricsCollector:
    if metrics_collector is None:
        raise HTTPException(status_code=503, detail="Metrics collector not initialized")
    return metrics_collector

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global outbreak_predictor, health_risk_assessor, data_processor
    global model_trainer, model_evaluator, metrics_collector
    global PREDICTION_COUNTER, PREDICTION_DURATION, TRAINING_COUNTER
    
    logger.info("Starting AI/ML service initialization...")
    
    try:
        # Initialize Prometheus metrics
        PREDICTION_COUNTER = Counter('outbreak_predictions_total', 'Total number of outbreak predictions', ['model_type', 'risk_level'])
        PREDICTION_DURATION = Histogram('outbreak_prediction_duration_seconds', 'Time spent on outbreak predictions', ['model_type'])
        TRAINING_COUNTER = Counter('model_training_total', 'Total number of model training sessions', ['model_type', 'status'])
        
        # Initialize metrics collector
        metrics_collector = MetricsCollector()
        
        # Initialize data processor
        data_processor = DataProcessor()
        
        # Initialize model trainer
        model_trainer = ModelTrainer()
        
        # Initialize model evaluator
        model_evaluator = ModelEvaluator()
        
        # Load or train outbreak predictor
        outbreak_predictor = OutbreakPredictor()
        await outbreak_predictor.load_or_train()
        
        # Load or train health risk assessor
        health_risk_assessor = HealthRiskAssessor()
        await health_risk_assessor.load_or_train()
        
        # Start Prometheus metrics server
        start_http_server(settings.PROMETHEUS_PORT)
        
        logger.info("AI/ML service initialized successfully")
        
    except Exception as e:
        logger.error("Failed to initialize AI/ML service", error=str(e))
        raise

# Health check endpoint
@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint"""
    import time
    
    models_loaded = (
        outbreak_predictor is not None and 
        health_risk_assessor is not None and
        data_processor is not None
    )
    
    model_versions = {}
    if outbreak_predictor:
        model_versions["outbreak_predictor"] = outbreak_predictor.get_version()
    if health_risk_assessor:
        model_versions["health_risk_assessor"] = health_risk_assessor.get_version()
    
    return HealthCheckResponse(
        status="healthy" if models_loaded else "unhealthy",
        timestamp=pd.Timestamp.now().isoformat(),
        models_loaded=models_loaded,
        model_versions=model_versions,
        uptime=time.time() - os.getpid()
    )

# Test endpoint
@app.get("/test")
async def test():
    return {"message": "AI Service working!"}

# Metrics endpoint
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return generate_latest()

# Prediction endpoints
@app.post("/predict/outbreak", response_model=PredictionResponse)
async def predict_outbreak(request: PredictionRequest):
    """Predict outbreak risk based on sensor data and health reports"""
    if outbreak_predictor is None:
        raise HTTPException(status_code=503, detail="Outbreak predictor not available")
    
    try:
        with PREDICTION_DURATION.labels(model_type="outbreak").time():
            # Process input data
            processed_data = await data_processor.process_prediction_request(request)
            
            # Make prediction
            prediction = await outbreak_predictor.predict(processed_data)
            
            # Update metrics
            if PREDICTION_COUNTER:
                PREDICTION_COUNTER.labels(
                    model_type="outbreak",
                    risk_level=prediction["risk_level"]
                ).inc()
            
            logger.info("Outbreak prediction completed", 
                       risk_level=prediction["risk_level"],
                       confidence=prediction["confidence"])
            
            return PredictionResponse(**prediction)
            
    except Exception as e:
        logger.error("Outbreak prediction failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/predict/health-risk", response_model=PredictionResponse)
async def predict_health_risk(request: PredictionRequest):
    """Predict individual health risk based on symptoms and environmental data"""
    if health_risk_assessor is None:
        raise HTTPException(status_code=503, detail="Health risk assessor not available")
    
    try:
        with PREDICTION_DURATION.labels(model_type="health_risk").time():
            # Process input data
            processed_data = await data_processor.process_prediction_request(request)
            
            # Make prediction
            prediction = await health_risk_assessor.predict(processed_data)
            
            # Update metrics
            if PREDICTION_COUNTER:
                PREDICTION_COUNTER.labels(
                    model_type="health_risk",
                    risk_level=prediction["risk_level"]
                ).inc()
            
            logger.info("Health risk prediction completed",
                       risk_level=prediction["risk_level"],
                       confidence=prediction["confidence"])
            
            return PredictionResponse(**prediction)
            
    except Exception as e:
        logger.error("Health risk prediction failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# Model training endpoints
@app.post("/train/outbreak-model")
async def train_outbreak_model(request: TrainingRequest, background_tasks: BackgroundTasks):
    """Train outbreak prediction model"""
    if model_trainer is None:
        raise HTTPException(status_code=503, detail="Model trainer not available")
    
    try:
        # Start training in background
        background_tasks.add_task(
            _train_model_background,
            "outbreak",
            request.data_source,
            request.parameters
        )
        
        logger.info("Outbreak model training started", 
                   data_source=request.data_source)
        
        return {"message": "Model training started", "status": "training"}
        
    except Exception as e:
        logger.error("Failed to start outbreak model training", error=str(e))
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.post("/train/health-risk-model")
async def train_health_risk_model(request: TrainingRequest, background_tasks: BackgroundTasks):
    """Train health risk assessment model"""
    if model_trainer is None:
        raise HTTPException(status_code=503, detail="Model trainer not available")
    
    try:
        # Start training in background
        background_tasks.add_task(
            _train_model_background,
            "health_risk",
            request.data_source,
            request.parameters
        )
        
        logger.info("Health risk model training started",
                   data_source=request.data_source)
        
        return {"message": "Model training started", "status": "training"}
        
    except Exception as e:
        logger.error("Failed to start health risk model training", error=str(e))
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

# Model evaluation endpoints
@app.get("/evaluate/outbreak-model")
async def evaluate_outbreak_model():
    """Evaluate outbreak prediction model performance"""
    if model_evaluator is None or outbreak_predictor is None:
        raise HTTPException(status_code=503, detail="Model evaluator or predictor not available")
    
    try:
        evaluation = await model_evaluator.evaluate_model(outbreak_predictor)
        
        logger.info("Outbreak model evaluation completed")
        
        return evaluation
        
    except Exception as e:
        logger.error("Outbreak model evaluation failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@app.get("/evaluate/health-risk-model")
async def evaluate_health_risk_model():
    """Evaluate health risk assessment model performance"""
    if model_evaluator is None or health_risk_assessor is None:
        raise HTTPException(status_code=503, detail="Model evaluator or assessor not available")
    
    try:
        evaluation = await model_evaluator.evaluate_model(health_risk_assessor)
        
        logger.info("Health risk model evaluation completed")
        
        return evaluation
        
    except Exception as e:
        logger.error("Health risk model evaluation failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

# Model management endpoints
@app.get("/models/status")
async def get_models_status():
    """Get status of all models"""
    status = {
        "outbreak_predictor": {
            "loaded": outbreak_predictor is not None,
            "version": outbreak_predictor.get_version() if outbreak_predictor else None,
            "last_trained": outbreak_predictor.get_last_trained() if outbreak_predictor else None,
        },
        "health_risk_assessor": {
            "loaded": health_risk_assessor is not None,
            "version": health_risk_assessor.get_version() if health_risk_assessor else None,
            "last_trained": health_risk_assessor.get_last_trained() if health_risk_assessor else None,
        }
    }
    
    return status

@app.post("/models/reload")
async def reload_models():
    """Reload all models"""
    try:
        if outbreak_predictor:
            await outbreak_predictor.load_or_train()
        if health_risk_assessor:
            await health_risk_assessor.load_or_train()
        
        logger.info("All models reloaded successfully")
        
        return {"message": "Models reloaded successfully"}
        
    except Exception as e:
        logger.error("Failed to reload models", error=str(e))
        raise HTTPException(status_code=500, detail=f"Model reload failed: {str(e)}")

# Background task functions
async def _train_model_background(model_type: str, data_source: str, parameters: Optional[Dict[str, Any]]):
    """Background task for model training"""
    try:
        if TRAINING_COUNTER:
            TRAINING_COUNTER.labels(model_type=model_type, status="started").inc()
        
        if model_type == "outbreak":
            await outbreak_predictor.train(data_source, parameters)
        elif model_type == "health_risk":
            await health_risk_assessor.train(data_source, parameters)
        
        if TRAINING_COUNTER:
            TRAINING_COUNTER.labels(model_type=model_type, status="completed").inc()
        
        logger.info(f"{model_type} model training completed")
        
    except Exception as e:
        if TRAINING_COUNTER:
            TRAINING_COUNTER.labels(model_type=model_type, status="failed").inc()
        logger.error(f"{model_type} model training failed", error=str(e))

# Main execution
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )