import React from 'react';
import {
  Box,
} from '@mui/material';
import TelemetryAnalytics from './TelemetryAnalytics';
import { Camera } from '../../services/api';

interface TelemetryTabProps {
  camera: Camera;
  cameraId: string;
}

const TelemetryTab: React.FC<TelemetryTabProps> = ({
  camera,
  cameraId
}) => {
  return (
    <Box>
      {/* Analytics Section */}
      <TelemetryAnalytics cameraId={cameraId} />
    </Box>
  );
};

export default TelemetryTab; 