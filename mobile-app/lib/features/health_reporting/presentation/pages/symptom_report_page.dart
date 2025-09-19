import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:geolocator/geolocator.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/config/theme_config.dart';
import '../../../../core/providers/location_provider.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/custom_text_field.dart';
import '../../../../core/widgets/loading_overlay.dart';
import '../../../../core/widgets/error_snackbar.dart';
import '../../../../core/widgets/success_snackbar.dart';
import '../widgets/symptom_selection_widget.dart';
import '../widgets/severity_slider_widget.dart';
import '../widgets/location_picker_widget.dart';
import '../providers/symptom_report_provider.dart';

class SymptomReportPage extends ConsumerStatefulWidget {
  const SymptomReportPage({super.key});

  @override
  ConsumerState<SymptomReportPage> createState() => _SymptomReportPageState();
}

class _SymptomReportPageState extends ConsumerState<SymptomReportPage> {
  final _formKey = GlobalKey<FormBuilderState>();
  final _descriptionController = TextEditingController();
  
  List<String> _selectedSymptoms = [];
  double _severityLevel = 1.0;
  Position? _selectedLocation;
  DateTime _symptomOnset = DateTime.now();
  bool _hasFever = false;
  bool _hasCough = false;
  bool _hasShortnessOfBreath = false;
  bool _hasHeadache = false;
  bool _hasNausea = false;
  bool _hasDiarrhea = false;
  bool _hasFatigue = false;
  bool _hasBodyAches = false;

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reportState = ref.watch(symptomReportProvider);
    final locationState = ref.watch(locationProvider);
    
    ref.listen<SymptomReportState>(symptomReportProvider, (previous, next) {
      if (next is SymptomReportError) {
        ErrorSnackbar.show(context, next.message);
      } else if (next is SymptomReportSuccess) {
        SuccessSnackbar.show(context, 'Symptom report submitted successfully!');
        context.pop();
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Report Symptoms'),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline),
            onPressed: () {
              _showHelpDialog();
            },
          ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: reportState is SymptomReportLoading,
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(ThemeConfig.spacingL),
            child: FormBuilder(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(ThemeConfig.spacingL),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.health_and_safety,
                                color: ThemeConfig.primaryColor,
                                size: 32,
                              ),
                              const SizedBox(width: ThemeConfig.spacingM),
                              Expanded(
                                child: Text(
                                  'Health Symptom Report',
                                  style: Theme.of(context).textTheme.headlineSmall,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: ThemeConfig.spacingM),
                          Text(
                            'Help us track potential health outbreaks by reporting your symptoms. Your information is confidential and will be used for public health monitoring.',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: ThemeConfig.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: ThemeConfig.spacingL),
                  
                  // Symptom Selection
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(ThemeConfig.spacingL),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Select Symptoms',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: ThemeConfig.spacingM),
                          const Text(
                            'Check all symptoms you are currently experiencing:',
                            style: TextStyle(color: ThemeConfig.textSecondary),
                          ),
                          const SizedBox(height: ThemeConfig.spacingL),
                          
                          // Symptom checkboxes
                          _buildSymptomCheckbox(
                            'Fever',
                            _hasFever,
                            (value) => setState(() => _hasFever = value!),
                            Icons.thermostat,
                          ),
                          _buildSymptomCheckbox(
                            'Cough',
                            _hasCough,
                            (value) => setState(() => _hasCough = value!),
                            Icons.coughing,
                          ),
                          _buildSymptomCheckbox(
                            'Shortness of Breath',
                            _hasShortnessOfBreath,
                            (value) => setState(() => _hasShortnessOfBreath = value!),
                            Icons.air,
                          ),
                          _buildSymptomCheckbox(
                            'Headache',
                            _hasHeadache,
                            (value) => setState(() => _hasHeadache = value!),
                            Icons.psychology,
                          ),
                          _buildSymptomCheckbox(
                            'Nausea',
                            _hasNausea,
                            (value) => setState(() => _hasNausea = value!),
                            Icons.sick,
                          ),
                          _buildSymptomCheckbox(
                            'Diarrhea',
                            _hasDiarrhea,
                            (value) => setState(() => _hasDiarrhea = value!),
                            Icons.warning,
                          ),
                          _buildSymptomCheckbox(
                            'Fatigue',
                            _hasFatigue,
                            (value) => setState(() => _hasFatigue = value!),
                            Icons.bedtime,
                          ),
                          _buildSymptomCheckbox(
                            'Body Aches',
                            _hasBodyAches,
                            (value) => setState(() => _hasBodyAches = value!),
                            Icons.accessibility_new,
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: ThemeConfig.spacingL),
                  
                  // Severity Level
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(ThemeConfig.spacingL),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Symptom Severity',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: ThemeConfig.spacingM),
                          SeveritySliderWidget(
                            value: _severityLevel,
                            onChanged: (value) {
                              setState(() {
                                _severityLevel = value;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: ThemeConfig.spacingL),
                  
                  // Symptom Onset Date
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(ThemeConfig.spacingL),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'When did symptoms start?',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: ThemeConfig.spacingM),
                          FormBuilderDateTimePicker(
                            name: 'symptom_onset',
                            initialValue: _symptomOnset,
                            inputType: InputType.date,
                            decoration: const InputDecoration(
                              labelText: 'Symptom Onset Date',
                              prefixIcon: Icon(Icons.calendar_today),
                            ),
                            onChanged: (value) {
                              if (value != null) {
                                setState(() {
                                  _symptomOnset = value;
                                });
                              }
                            },
                            validators: [
                              FormBuilderValidators.required(
                                errorText: 'Please select when symptoms started',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: ThemeConfig.spacingL),
                  
                  // Location
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(ThemeConfig.spacingL),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Location',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: ThemeConfig.spacingM),
                          LocationPickerWidget(
                            selectedLocation: _selectedLocation,
                            onLocationSelected: (location) {
                              setState(() {
                                _selectedLocation = location;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: ThemeConfig.spacingL),
                  
                  // Additional Notes
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(ThemeConfig.spacingL),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Additional Notes (Optional)',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: ThemeConfig.spacingM),
                          CustomTextField(
                            name: 'description',
                            controller: _descriptionController,
                            labelText: 'Additional Information',
                            hintText: 'Any additional details about your symptoms...',
                            maxLines: 3,
                            maxLength: AppConfig.maxDescriptionLength,
                            validators: [
                              FormBuilderValidators.maxLength(
                                AppConfig.maxDescriptionLength,
                                errorText: 'Description must be less than ${AppConfig.maxDescriptionLength} characters',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: ThemeConfig.spacingXL),
                  
                  // Submit Button
                  CustomButton(
                    text: 'Submit Report',
                    onPressed: _handleSubmit,
                    isLoading: reportState is SymptomReportLoading,
                  ),
                  
                  const SizedBox(height: ThemeConfig.spacingL),
                  
                  // Privacy Notice
                  Text(
                    'Your health information is confidential and will only be used for public health monitoring and outbreak prevention.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: ThemeConfig.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSymptomCheckbox(
    String label,
    bool value,
    ValueChanged<bool?> onChanged,
    IconData icon,
  ) {
    return CheckboxListTile(
      value: value,
      onChanged: onChanged,
      title: Text(label),
      secondary: Icon(icon),
      activeColor: ThemeConfig.primaryColor,
      contentPadding: EdgeInsets.zero,
    );
  }

  void _handleSubmit() {
    if (_formKey.currentState?.saveAndValidate() ?? false) {
      // Collect selected symptoms
      _selectedSymptoms = [];
      if (_hasFever) _selectedSymptoms.add('fever');
      if (_hasCough) _selectedSymptoms.add('cough');
      if (_hasShortnessOfBreath) _selectedSymptoms.add('shortness_of_breath');
      if (_hasHeadache) _selectedSymptoms.add('headache');
      if (_hasNausea) _selectedSymptoms.add('nausea');
      if (_hasDiarrhea) _selectedSymptoms.add('diarrhea');
      if (_hasFatigue) _selectedSymptoms.add('fatigue');
      if (_hasBodyAches) _selectedSymptoms.add('body_aches');
      
      if (_selectedSymptoms.isEmpty) {
        ErrorSnackbar.show(context, 'Please select at least one symptom');
        return;
      }
      
      final formData = _formKey.currentState!.value;
      
      ref.read(symptomReportProvider.notifier).submitReport(
        symptoms: _selectedSymptoms,
        severity: _severityLevel,
        onsetDate: _symptomOnset,
        location: _selectedLocation,
        description: formData['description'] ?? '',
      );
    }
  }

  void _showHelpDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Help - Symptom Reporting'),
        content: const SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'How to report symptoms:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text('1. Select all symptoms you are experiencing'),
              Text('2. Rate the severity of your symptoms'),
              Text('3. Choose when symptoms started'),
              Text('4. Allow location access for accurate tracking'),
              Text('5. Add any additional notes if needed'),
              SizedBox(height: 16),
              Text(
                'Privacy:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text('Your information is confidential and will only be used for public health monitoring.'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }
}
