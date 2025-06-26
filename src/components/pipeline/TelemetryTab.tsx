import React from 'react';
import {
  Box,
} from '@mui/material';
import TelemetryAnalytics from './TelemetryAnalytics';
// import RawTelemetryTable from './RawTelemetryTable';
import { Camera, EventRecord } from '../../services/api';

interface TelemetryTabProps {
  camera: Camera;
  cameraId: string;
  databaseRecords: EventRecord[];
  isLoadingRecords: boolean;
  isDeletingRecords: boolean;
  totalEvents: number;
  totalFrames: number;
  page: number;
  rowsPerPage: number;
  handlePageChange: (event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fetchDatabaseRecords: () => Promise<void>;
  handleDeleteAllRecords: () => Promise<void>;
  getEventTypeName: (type: number) => string;
  formatTimestamp: (timestamp: number) => string;
}

const TelemetryTab: React.FC<TelemetryTabProps> = ({
  camera,
  cameraId,
  databaseRecords,
  isLoadingRecords,
  isDeletingRecords,
  totalEvents,
  totalFrames,
  page,
  rowsPerPage,
  handlePageChange,
  handleChangeRowsPerPage,
  fetchDatabaseRecords,
  handleDeleteAllRecords,
  getEventTypeName,
  formatTimestamp
}) => {
  return (
    <Box>
      {/* Analytics Section */}
      <TelemetryAnalytics cameraId={cameraId} />
      
      {/* Raw Telemetry Events Section - Commented out for now */}
      {/*
      <RawTelemetryTable
        camera={camera}
        databaseRecords={databaseRecords}
        isLoadingRecords={isLoadingRecords}
        isDeletingRecords={isDeletingRecords}
        totalEvents={totalEvents}
        totalFrames={totalFrames}
        page={page}
        rowsPerPage={rowsPerPage}
        handlePageChange={handlePageChange}
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        fetchDatabaseRecords={fetchDatabaseRecords}
        handleDeleteAllRecords={handleDeleteAllRecords}
        getEventTypeName={getEventTypeName}
        formatTimestamp={formatTimestamp}
      />
      */}
    </Box>
  );
};

export default TelemetryTab; 