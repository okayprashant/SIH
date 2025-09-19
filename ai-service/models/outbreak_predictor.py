"""
Outbreak Prediction Model
Uses machine learning to predict disease outbreak risk based on environmental and health data
"""

import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import structlog
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
import warnings

warnings.filterwarnings('ignore')

logger = structlog.get_logger()

class OutbreakPredictor:
    """
    Outbreak prediction model using ensemble methods
    Predicts risk levels: low, medium, high
    """
    
    def __init__(self, model_path: str = "models/outbreak_model.pkl"):
        self.model_path = Path(model_path)
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        
        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.feature_columns = None
        self.version = "1.0.0"
        self.last_trained = None
        
        # Risk level thresholds
        self.risk_thresholds = {
            'low': 0.3,
            'medium': 0.7,
            'high': 1.0
        }
        
        # Feature importance weights
        self.feature_weights = {
            'symptom_density': 0.25,
            'water_quality_score': 0.20,
            'temperature_anomaly': 0.15,
            'population_density': 0.15,
            'recent_outbreaks': 0.10,
            'seasonal_factor': 0.10,
            'weather_conditions': 0.05
        }
    
    async def load_or_train(self):
        """Load existing model or train new one"""
        try:
            if self.model_path.exists():
                await self.load_model()
                logger.info("Outbreak predictor model loaded successfully")
            else:
                await self.train()
                logger.info("Outbreak predictor model trained successfully")
        except Exception as e:
            logger.error("Failed to load or train outbreak predictor", error=str(e))
            raise
    
    async def load_model(self):
        """Load pre-trained model from disk"""
        try:
            model_data = joblib.load(self.model_path)
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.label_encoder = model_data['label_encoder']
            self.feature_columns = model_data['feature_columns']
            self.version = model_data.get('version', '1.0.0')
            self.last_trained = model_data.get('last_trained')
            
            logger.info("Outbreak predictor model loaded", version=self.version)
            
        except Exception as e:
            logger.error("Failed to load outbreak predictor model", error=str(e))
            raise
    
    async def save_model(self):
        """Save trained model to disk"""
        try:
            model_data = {
                'model': self.model,
                'scaler': self.scaler,
                'label_encoder': self.label_encoder,
                'feature_columns': self.feature_columns,
                'version': self.version,
                'last_trained': datetime.now().isoformat(),
                'risk_thresholds': self.risk_thresholds,
                'feature_weights': self.feature_weights
            }
            
            joblib.dump(model_data, self.model_path)
            logger.info("Outbreak predictor model saved", path=str(self.model_path))
            
        except Exception as e:
            logger.error("Failed to save outbreak predictor model", error=str(e))
            raise
    
    async def train(self, data_source: str = "synthetic", parameters: Optional[Dict[str, Any]] = None):
        """Train the outbreak prediction model"""
        try:
            logger.info("Starting outbreak predictor training", data_source=data_source)
            
            # Load training data
            if data_source == "synthetic":
                X, y = self._generate_synthetic_data()
            else:
                X, y = await self._load_real_data(data_source)
            
            # Prepare features
            X_processed, feature_columns = self._prepare_features(X)
            self.feature_columns = feature_columns
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X_processed, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Create preprocessing pipeline
            numeric_features = X_processed.select_dtypes(include=[np.number]).columns.tolist()
            categorical_features = X_processed.select_dtypes(include=['object']).columns.tolist()
            
            preprocessor = ColumnTransformer(
                transformers=[
                    ('num', StandardScaler(), numeric_features),
                    ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
                ]
            )
            
            # Create model pipeline
            model_params = parameters or {
                'n_estimators': 100,
                'max_depth': 10,
                'min_samples_split': 5,
                'min_samples_leaf': 2,
                'random_state': 42
            }
            
            self.model = Pipeline([
                ('preprocessor', preprocessor),
                ('classifier', RandomForestClassifier(**model_params))
            ])
            
            # Train model
            self.model.fit(X_train, y_train)
            
            # Evaluate model
            train_score = self.model.score(X_train, y_train)
            test_score = self.model.score(X_test, y_test)
            
            logger.info("Outbreak predictor training completed",
                       train_score=train_score,
                       test_score=test_score)
            
            # Save model
            await self.save_model()
            self.last_trained = datetime.now().isoformat()
            
            return {
                'train_score': train_score,
                'test_score': test_score,
                'model_version': self.version
            }
            
        except Exception as e:
            logger.error("Outbreak predictor training failed", error=str(e))
            raise
    
    async def predict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Make outbreak prediction"""
        try:
            if self.model is None:
                raise ValueError("Model not loaded or trained")
            
            # Prepare input features
            features = self._extract_features(data)
            features_df = pd.DataFrame([features])
            
            # Ensure all required features are present
            for col in self.feature_columns:
                if col not in features_df.columns:
                    features_df[col] = 0
            
            # Reorder columns to match training data
            features_df = features_df[self.feature_columns]
            
            # Make prediction
            prediction_proba = self.model.predict_proba(features_df)[0]
            prediction_class = self.model.predict(features_df)[0]
            
            # Map prediction to risk levels
            risk_levels = ['low', 'medium', 'high']
            risk_level = risk_levels[prediction_class]
            confidence = max(prediction_proba)
            
            # Calculate probability scores
            probability_scores = {
                'low': prediction_proba[0],
                'medium': prediction_proba[1],
                'high': prediction_proba[2]
            }
            
            # Identify contributing factors
            contributing_factors = self._identify_contributing_factors(features)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(risk_level, features)
            
            return {
                'risk_level': risk_level,
                'confidence': float(confidence),
                'probability_scores': probability_scores,
                'contributing_factors': contributing_factors,
                'recommendations': recommendations,
                'model_version': self.version,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error("Outbreak prediction failed", error=str(e))
            raise
    
    def _generate_synthetic_data(self) -> Tuple[pd.DataFrame, np.ndarray]:
        """Generate synthetic training data"""
        np.random.seed(42)
        n_samples = 10000
        
        # Generate features
        data = {
            'symptom_density': np.random.exponential(2, n_samples),
            'water_quality_score': np.random.normal(7.5, 1.5, n_samples),
            'temperature_anomaly': np.random.normal(0, 3, n_samples),
            'population_density': np.random.lognormal(8, 1, n_samples),
            'recent_outbreaks': np.random.poisson(0.5, n_samples),
            'seasonal_factor': np.random.uniform(0, 1, n_samples),
            'weather_conditions': np.random.choice(['sunny', 'rainy', 'cloudy', 'stormy'], n_samples),
            'ph_level': np.random.normal(7.0, 1.0, n_samples),
            'turbidity': np.random.exponential(10, n_samples),
            'tds_level': np.random.normal(200, 100, n_samples),
            'location_type': np.random.choice(['urban', 'rural', 'suburban'], n_samples),
            'time_of_year': np.random.choice(['spring', 'summer', 'fall', 'winter'], n_samples)
        }
        
        df = pd.DataFrame(data)
        
        # Generate target variable based on feature combinations
        risk_score = (
            df['symptom_density'] * 0.3 +
            (8 - df['water_quality_score']) * 0.2 +
            abs(df['temperature_anomaly']) * 0.1 +
            df['population_density'] / 1000 * 0.2 +
            df['recent_outbreaks'] * 0.1 +
            df['seasonal_factor'] * 0.1
        )
        
        # Convert to risk levels
        y = np.where(risk_score < 2, 0, np.where(risk_score < 4, 1, 2))
        
        return df, y
    
    async def _load_real_data(self, data_source: str) -> Tuple[pd.DataFrame, np.ndarray]:
        """Load real training data from database or API"""
        # This would connect to your database and load real data
        # For now, return synthetic data
        return self._generate_synthetic_data()
    
    def _prepare_features(self, X: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """Prepare features for training"""
        # Handle missing values
        X_processed = X.fillna(X.median())
        
        # Create additional features
        X_processed['water_quality_risk'] = np.where(
            X_processed['water_quality_score'] < 6.5, 1, 0
        )
        X_processed['temperature_risk'] = np.where(
            abs(X_processed['temperature_anomaly']) > 5, 1, 0
        )
        X_processed['population_risk'] = np.where(
            X_processed['population_density'] > 1000, 1, 0
        )
        
        return X_processed, X_processed.columns.tolist()
    
    def _extract_features(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract features from input data"""
        features = {}
        
        # Extract sensor data features
        if 'sensor_data' in data and data['sensor_data']:
            sensor_data = data['sensor_data']
            
            # Calculate water quality score
            ph_scores = [s['ph'] for s in sensor_data if 'ph' in s]
            turbidity_scores = [s['turbidity'] for s in sensor_data if 'turbidity' in s]
            temp_scores = [s['temperature'] for s in sensor_data if 'temperature' in s]
            tds_scores = [s['tds'] for s in sensor_data if 'tds' in s]
            
            features['water_quality_score'] = np.mean([
                np.mean(ph_scores) if ph_scores else 7.0,
                (100 - np.mean(turbidity_scores)) / 10 if turbidity_scores else 7.0,
                np.mean(temp_scores) / 10 if temp_scores else 7.0,
                (1000 - np.mean(tds_scores)) / 100 if tds_scores else 7.0
            ])
            
            features['ph_level'] = np.mean(ph_scores) if ph_scores else 7.0
            features['turbidity'] = np.mean(turbidity_scores) if turbidity_scores else 10.0
            features['tds_level'] = np.mean(tds_scores) if tds_scores else 200.0
            
            # Temperature anomaly
            if temp_scores:
                features['temperature_anomaly'] = np.mean(temp_scores) - 25.0
            else:
                features['temperature_anomaly'] = 0.0
        
        # Extract health report features
        if 'health_reports' in data and data['health_reports']:
            health_reports = data['health_reports']
            
            # Calculate symptom density
            total_symptoms = sum(len(r.get('symptoms', [])) for r in health_reports)
            features['symptom_density'] = total_symptoms / len(health_reports) if health_reports else 0
            
            # Calculate average severity
            avg_severity = np.mean([r.get('severity', 1) for r in health_reports])
            features['severity_score'] = avg_severity / 10.0
        else:
            features['symptom_density'] = 0
            features['severity_score'] = 0
        
        # Location features
        if 'location' in data and data['location']:
            lat = data['location'].get('latitude', 0)
            lon = data['location'].get('longitude', 0)
            
            # Simple population density estimation based on coordinates
            features['population_density'] = self._estimate_population_density(lat, lon)
            features['location_type'] = self._classify_location_type(lat, lon)
        else:
            features['population_density'] = 500
            features['location_type'] = 'urban'
        
        # Time-based features
        current_time = datetime.now()
        features['seasonal_factor'] = self._calculate_seasonal_factor(current_time)
        features['time_of_year'] = self._get_season(current_time)
        
        # Additional features
        features['recent_outbreaks'] = 0  # Would be calculated from historical data
        features['weather_conditions'] = 'sunny'  # Would be fetched from weather API
        
        return features
    
    def _estimate_population_density(self, lat: float, lon: float) -> float:
        """Estimate population density based on coordinates"""
        # Simple estimation - in real implementation, use actual population data
        if -90 <= lat <= 90 and -180 <= lon <= 180:
            # Urban areas typically have higher population density
            if abs(lat) < 30:  # Tropical/subtropical regions
                return np.random.lognormal(8, 1)
            else:
                return np.random.lognormal(7, 1)
        return 500
    
    def _classify_location_type(self, lat: float, lon: float) -> str:
        """Classify location type based on coordinates"""
        # Simple classification - in real implementation, use actual geographic data
        if abs(lat) < 30:
            return 'urban'
        elif abs(lat) < 60:
            return 'suburban'
        else:
            return 'rural'
    
    def _calculate_seasonal_factor(self, date: datetime) -> float:
        """Calculate seasonal factor for outbreak prediction"""
        month = date.month
        # Higher risk in certain months (e.g., flu season)
        seasonal_risk = {
            1: 0.8, 2: 0.9, 3: 0.7, 4: 0.5, 5: 0.4, 6: 0.3,
            7: 0.2, 8: 0.3, 9: 0.4, 10: 0.6, 11: 0.7, 12: 0.8
        }
        return seasonal_risk.get(month, 0.5)
    
    def _get_season(self, date: datetime) -> str:
        """Get season based on date"""
        month = date.month
        if month in [12, 1, 2]:
            return 'winter'
        elif month in [3, 4, 5]:
            return 'spring'
        elif month in [6, 7, 8]:
            return 'summer'
        else:
            return 'fall'
    
    def _identify_contributing_factors(self, features: Dict[str, Any]) -> List[str]:
        """Identify key contributing factors to the prediction"""
        factors = []
        
        if features.get('symptom_density', 0) > 3:
            factors.append("High symptom density in the area")
        
        if features.get('water_quality_score', 7) < 6.5:
            factors.append("Poor water quality detected")
        
        if abs(features.get('temperature_anomaly', 0)) > 5:
            factors.append("Unusual temperature patterns")
        
        if features.get('population_density', 0) > 1000:
            factors.append("High population density")
        
        if features.get('recent_outbreaks', 0) > 0:
            factors.append("Recent outbreak history in the area")
        
        if features.get('seasonal_factor', 0.5) > 0.7:
            factors.append("Seasonal risk factors present")
        
        return factors[:5]  # Return top 5 factors
    
    def _generate_recommendations(self, risk_level: str, features: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on risk level and features"""
        recommendations = []
        
        if risk_level == 'high':
            recommendations.extend([
                "Issue immediate public health alert",
                "Increase monitoring frequency",
                "Implement containment measures",
                "Notify health authorities",
                "Consider temporary restrictions"
            ])
        elif risk_level == 'medium':
            recommendations.extend([
                "Increase surveillance in the area",
                "Monitor water quality closely",
                "Prepare response protocols",
                "Inform local health workers",
                "Track symptom patterns"
            ])
        else:
            recommendations.extend([
                "Continue routine monitoring",
                "Maintain current surveillance levels",
                "Monitor for any changes",
                "Keep response teams on standby"
            ])
        
        # Add specific recommendations based on features
        if features.get('water_quality_score', 7) < 6.5:
            recommendations.append("Investigate and improve water quality")
        
        if features.get('symptom_density', 0) > 2:
            recommendations.append("Investigate symptom clusters")
        
        return recommendations[:8]  # Return top 8 recommendations
    
    def get_version(self) -> str:
        """Get model version"""
        return self.version
    
    def get_last_trained(self) -> Optional[str]:
        """Get last training timestamp"""
        return self.last_trained
