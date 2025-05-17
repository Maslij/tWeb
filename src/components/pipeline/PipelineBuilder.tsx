import React, { useState, useEffect } from 'react';
import { AIModel } from '../../models/AIModel';
import { Component } from '../../models/Component';
import { apiService } from '../../services/apiService';
import { isComponentAllowedForLicenseTier } from '../../utils/licenseUtils';
import { getComponentTypeName } from '../../utils/componentUtils';

const [objectDetectionAvailable, setObjectDetectionAvailable] = useState<boolean>(false);
const [objectClassificationAvailable, setObjectClassificationAvailable] = useState<boolean>(false);
const [ageGenderDetectionAvailable, setAgeGenderDetectionAvailable] = useState<boolean>(false);
const [inferenceServerAvailable, setInferenceServerAvailable] = useState<boolean>(false);

useEffect(() => {
  if (!cameraId) return;
  
  const fetchData = async () => {
    setLoading(true);
    try {
      // ... existing license fetching code ...
      
      // Fetch camera data
      const cameraData = await apiService.cameras.getById(cameraId);
      if (!cameraData) {
        setError('Camera not found.');
        setLoading(false);
        return;
      }
      setCamera(cameraData);
      
      // ... existing component types fetching code ...
      
      // Fetch camera components
      const components = await apiService.components.getAll(cameraId);
      if (components) {
        // ... existing component handling code ...
      }

      // Fetch available models
      const modelResponse = await apiService.models.getObjectDetectionModels();
      if (modelResponse && modelResponse.models) {
        setAvailableModels(modelResponse.models);
        
        // Check overall inference server availability
        setInferenceServerAvailable(modelResponse.models.length > 0);
        
        // Filter out object detection models
        const detectionModels = modelResponse.models.filter(
          (model: AIModel) => model.type === 'object_detection' && model.status === 'loaded'
        );
        
        setObjectDetectionModels(detectionModels);
        setObjectDetectionAvailable(detectionModels.length > 0);
        
        // Check for classification models
        const classificationModels = modelResponse.models.filter(
          (model: AIModel) => model.type === 'image_classification' && model.status === 'loaded'
        );
        setObjectClassificationAvailable(classificationModels.length > 0);
        
        // Check for age gender detection models
        const ageGenderModels = modelResponse.models.filter(
          (model: AIModel) => model.type === 'age_gender_detection' && model.status === 'loaded'
        );
        setAgeGenderDetectionAvailable(ageGenderModels.length > 0);
        
        // If object detection models are available, set default model
        if (detectionModels.length > 0) {
          // ... existing code ...
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again later.');
      // If we can't fetch models, we assume the inference server is down
      setInferenceServerAvailable(false);
      setObjectDetectionAvailable(false);
      setObjectClassificationAvailable(false);
      setAgeGenderDetectionAvailable(false);
    } finally {
      setLoading(false);
    }
  };
  
  fetchData();
}, [cameraId]);

const canAddComponent = (type: string, category: 'source' | 'processor' | 'sink'): boolean => {
  // Source can always be added if none exists
  if (category === 'source') {
    return !sourceComponent;
  }
  
  // Any processor or sink requires a source
  if (!sourceComponent) {
    return false;
  }
  
  // Check if a component of this specific type already exists
  if (category === 'processor') {
    // Check if a processor with this type already exists
    const existingProcessor = processorComponents.find(
      (p: Component) => {
        if (typeof p.type === 'string') {
          return p.type === type;
        }
        return false;
      }
    );
    
    if (existingProcessor) {
      return false; // Component of this type already exists
    }
  } else if (category === 'sink') {
    // Check if a sink with this type already exists
    const existingSink = sinkComponents.find(
      (s: Component) => {
        if (typeof s.type === 'string') {
          return s.type === type;
        }
        return false;
      }
    );
    
    if (existingSink) {
      return false; // Component of this type already exists
    }
  }
  
  // For AI-dependent components, check if the corresponding model type is available
  if (category === 'processor') {
    if (type === 'object_detection') {
      return objectDetectionAvailable;
    } else if (type === 'object_classification') {
      return objectClassificationAvailable;
    } else if (type === 'age_gender_detection') {
      return ageGenderDetectionAvailable;
    }
  }
  
  // Check license tier restrictions
  const tierRestrictions = isComponentAllowedForLicenseTier(type, category, licenseInfo.tier_id);
  if (!tierRestrictions) {
    return false;
  }
  
  // If this component type has dependencies, check if they're satisfied
  if (dependencies[type]) {
    const requiredTypes = dependencies[type];
    // Check if we have all required components
    for (const requiredType of requiredTypes) {
      // Check if any processor matches the required type
      const hasRequiredComponent = processorComponents.some(
        processor => processor.type === requiredType
      );
      
      if (!hasRequiredComponent) {
        return false;
      }
    }
  }
  
  return true;
};

const getDisabledReason = (type: string, category: 'source' | 'processor' | 'sink'): string => {
  if (camera?.running) {
    return "Pipeline is running";
  }
  
  if (category === 'source' && sourceComponent) {
    return "Source component already exists";
  }
  
  if (!sourceComponent && (category === 'processor' || category === 'sink')) {
    return "Source component is required first";
  }
  
  // Check if component of this type already exists
  if (category === 'processor') {
    const existingProcessor = processorComponents.find(
      (p: Component) => {
        if (typeof p.type === 'string') {
          return p.type === type;
        }
        return false;
      }
    );
    
    if (existingProcessor) {
      return `${getComponentTypeName(type, 'processor')} component already exists`;
    }
  } else if (category === 'sink') {
    const existingSink = sinkComponents.find(
      (s: Component) => {
        if (typeof s.type === 'string') {
          return s.type === type;
        }
        return false;
      }
    );
    
    if (existingSink) {
      return `${getComponentTypeName(type, 'sink')} component already exists`;
    }
  }
  
  // Check for AI-dependent components
  if (category === 'processor') {
    if (type === 'object_detection' && !objectDetectionAvailable) {
      return "Object detection model not available - check Triton server";
    } else if (type === 'object_classification' && !objectClassificationAvailable) {
      return "Classification model not available - check Triton server";
    } else if (type === 'age_gender_detection' && !ageGenderDetectionAvailable) {
      return "Age/gender model not available - check Triton server";
    }
  }
  
  // Check license tier restrictions
  if (!isComponentAllowedForLicenseTier(type, category, licenseInfo.tier_id)) {
    const tierNames = {
      1: "Basic",
      2: "Standard",
      3: "Professional"
    };
    const currentTier = tierNames[licenseInfo.tier_id as keyof typeof tierNames] || "Unknown";
    return `Requires ${tierNames[3]} license tier (Current: ${currentTier})`;
  }
  
  if (dependencies[type]) {
    const requiredTypes = dependencies[type];
    const missingDeps = requiredTypes.filter(reqType => 
      !processorComponents.some(proc => proc.type === reqType)
    );
    
    if (missingDeps.length > 0) {
      return `Requires ${missingDeps.map(dep => 
        getComponentTypeName(dep, 'processor')
      ).join(", ")}`;
    }
  }
  
  return "";
}; 