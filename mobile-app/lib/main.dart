import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'dart:async';
import 'dart:convert';
import 'dart:math';

void main() {
  runApp(const ArogyaApp());
}

class ArogyaApp extends StatelessWidget {
  const ArogyaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Arogya - Health Care',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: false,
        primarySwatch: Colors.blue,
        primaryColor: const Color(0xFF2196F3),
        scaffoldBackgroundColor: const Color(0xFFF5F5F5),
        fontFamily: 'Roboto',
        textTheme: const TextTheme(
          headlineLarge: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black87),
          headlineMedium: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87),
          bodyLarge: TextStyle(fontSize: 16, color: Colors.black87),
          bodyMedium: TextStyle(fontSize: 14, color: Colors.black87),
        ),
      ),
      home: const ArogyaHomePage(),
    );
  }
}

class ArogyaHomePage extends StatefulWidget {
  const ArogyaHomePage({super.key});

  @override
  State<ArogyaHomePage> createState() => _ArogyaHomePageState();
}

class _ArogyaHomePageState extends State<ArogyaHomePage> {
  Timer? _dataTimer;
  int _heartRate = 72;
  double _temperature = 36.5;
  int _oxygenLevel = 98;
  bool _isConnected = true;
  List<HealthData> _healthHistory = [];

  @override
  void initState() {
    super.initState();
    _startDataSimulation();
    _loadHealthHistory();
  }

  void _startDataSimulation() {
    _dataTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      setState(() {
        _heartRate = 65 + Random().nextInt(30);
        _temperature = 36.0 + Random().nextDouble() * 1.5;
        _oxygenLevel = 95 + Random().nextInt(5);
        _isConnected = Random().nextBool();
        
        _healthHistory.add(HealthData(
          timestamp: DateTime.now(),
          heartRate: _heartRate,
          temperature: _temperature,
          oxygenLevel: _oxygenLevel,
        ));
        
        if (_healthHistory.length > 10) {
          _healthHistory.removeAt(0);
        }
      });
    });
  }

  void _loadHealthHistory() {
    // Simulate loading health history
    for (int i = 0; i < 5; i++) {
      _healthHistory.add(HealthData(
        timestamp: DateTime.now().subtract(Duration(hours: i)),
        heartRate: 70 + Random().nextInt(20),
        temperature: 36.0 + Random().nextDouble() * 1.0,
        oxygenLevel: 95 + Random().nextInt(5),
      ));
    }
  }

  @override
  void dispose() {
    _dataTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Arogya',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        backgroundColor: const Color(0xFF2196F3),
        elevation: 2,
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications, color: Colors.white),
            onPressed: _showNotifications,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatusCard(),
            const SizedBox(height: 20),
            _buildVitalSignsGrid(),
            const SizedBox(height: 20),
            _buildQuickActions(),
            const SizedBox(height: 20),
            _buildHealthHistory(),
          ],
        ),
      ),
    );
  }


  Widget _buildStatusCard() {
    return Card(
      elevation: 4,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          color: _isConnected ? Colors.green.shade50 : Colors.red.shade50,
        ),
        child: Row(
          children: [
            Icon(
              _isConnected ? Icons.wifi : Icons.wifi_off,
              color: _isConnected ? Colors.green : Colors.red,
              size: 40,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _isConnected ? 'System Online' : 'System Offline',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: _isConnected ? Colors.green.shade700 : Colors.red.shade700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _isConnected
                        ? 'Health monitoring active'
                        : 'Reconnecting to sensors...',
                    style: TextStyle(
                      fontSize: 14,
                      color: _isConnected ? Colors.green.shade600 : Colors.red.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }


  Widget _buildVitalSignsGrid() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Health Status',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.3,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          children: [
            _buildVitalCard(
              'Heart Rate',
              _heartRate.toString(),
              'BPM',
              Icons.favorite,
              _getHeartRateColor(),
            ),
            _buildVitalCard(
              'Temperature',
              _temperature.toStringAsFixed(1),
              '°C',
              Icons.thermostat,
              _getTemperatureColor(),
            ),
            _buildVitalCard(
              'Oxygen',
              _oxygenLevel.toString(),
              '%',
              Icons.air,
              _getOxygenColor(),
            ),
            _buildVitalCard(
              'Status',
              _isConnected ? 'Good' : 'Check',
              '',
              Icons.health_and_safety,
              _isConnected ? Colors.green : Colors.orange,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildVitalCard(String title, String value, String unit, IconData icon, Color color) {
    return Card(
      elevation: 2,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          color: color.withOpacity(0.1),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                color: Colors.grey.shade700,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    color: color,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (unit.isNotEmpty)
                  Text(
                    unit,
                    style: TextStyle(
                      color: color,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }


  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Actions',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                'Report Symptoms',
                Icons.sick,
                Colors.orange,
                () => _showSymptomReport(),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                'Emergency',
                Icons.emergency,
                Colors.red,
                () => _showEmergency(),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                'Water Quality',
                Icons.water_drop,
                Colors.blue,
                () => _showWaterQuality(),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                'Health Tips',
                Icons.lightbulb,
                Colors.green,
                () => _showHealthTips(),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionButton(String title, IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.3), width: 1),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                color: color,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHealthHistory() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Recent Health Data',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        Card(
          elevation: 2,
          child: Container(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: _healthHistory.take(5).map((data) => _buildHistoryItem(data)).toList(),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildHistoryItem(HealthData data) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.health_and_safety, color: Colors.blue, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Heart: ${data.heartRate} BPM | Temp: ${data.temperature.toStringAsFixed(1)}°C | O2: ${data.oxygenLevel}%',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.black87,
                  ),
                ),
                Text(
                  '${data.timestamp.hour}:${data.timestamp.minute.toString().padLeft(2, '0')}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }


  // Color helpers
  Color _getHeartRateColor() {
    if (_heartRate < 60) return Colors.blue;
    if (_heartRate > 100) return Colors.red;
    return Colors.green;
  }

  Color _getTemperatureColor() {
    if (_temperature < 36.0) return Colors.blue;
    if (_temperature > 37.5) return Colors.red;
    return Colors.green;
  }

  Color _getOxygenColor() {
    if (_oxygenLevel < 95) return Colors.red;
    return Colors.green;
  }

  // Action methods
  void _showNotifications() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('No new notifications'),
        backgroundColor: Colors.blue,
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _showSymptomReport() {
    _showSimpleDialog('Report Symptoms', 'Symptom reporting feature coming soon!');
  }

  void _showEmergency() {
    _showSimpleDialog('Emergency Alert', 'Emergency alert system coming soon!');
  }

  void _showWaterQuality() {
    _showSimpleDialog('Water Quality', 'Water quality monitoring coming soon!');
  }

  void _showHealthTips() {
    _showSimpleDialog('Health Tips', 'Health tips and advice coming soon!');
  }

  void _showSimpleDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}

class HealthData {
  final DateTime timestamp;
  final int heartRate;
  final double temperature;
  final int oxygenLevel;

  HealthData({
    required this.timestamp,
    required this.heartRate,
    required this.temperature,
    required this.oxygenLevel,
  });
}
