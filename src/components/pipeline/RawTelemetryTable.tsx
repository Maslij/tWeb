import React from 'react';
import {
  Box,
  CircularProgress,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Paper,
  Tooltip,
} from '@mui/material';
import Typography from '../../components/ui/Typography';
import Button from '../../components/ui/Button';
import { DatabaseTableSkeleton } from './SkeletonComponents';
import RedoIcon from '@mui/icons-material/Redo';
import DatabaseIcon from '@mui/icons-material/Storage';
import DeleteIcon from '@mui/icons-material/Delete';
import { Camera, EventRecord } from '../../services/api';

interface RawTelemetryTableProps {
  camera: Camera;
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

const RawTelemetryTable: React.FC<RawTelemetryTableProps> = ({
  camera,
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
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <DatabaseIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">
          Raw Telemetry Events
          {totalEvents > 0 && !camera?.running && " (Last Session)"}
        </Typography>
      </Box>
    
      <Typography variant="body2" color="text.secondary" paragraph>
        View detailed telemetry events captured from your pipeline. These records show all events generated during processing.
        {camera?.running ? 
          " New records are being collected as the pipeline runs." : 
          " The pipeline is currently stopped, but you can still view previously collected records."}
      </Typography>
    
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Total Events: {totalEvents.toLocaleString()} | Total Frames: {totalFrames.toLocaleString()}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={isLoadingRecords ? <CircularProgress size={24} color="inherit" /> : <RedoIcon />}
            onClick={fetchDatabaseRecords}
            disabled={isLoadingRecords || isDeletingRecords}
          >
            {isLoadingRecords ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={isDeletingRecords ? <CircularProgress size={24} color="inherit" /> : <DeleteIcon />}
            onClick={handleDeleteAllRecords}
            disabled={isDeletingRecords || isLoadingRecords || totalEvents === 0}
          >
            {isDeletingRecords ? 'Deleting...' : 'Delete All Records'}
          </Button>
        </Box>
      </Box>
    
      {isLoadingRecords ? (
        <DatabaseTableSkeleton />
      ) : databaseRecords.length === 0 ? (
        <Box 
          sx={{ 
            textAlign: 'center', 
            p: 3, 
            border: '1px solid #ccc', 
            borderRadius: '4px', 
            height: '300px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}
        >
          <DatabaseIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No telemetry records found
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {!camera?.running && !totalFrames ? 
              "Start the pipeline to collect telemetry records" : 
              "No records have been collected yet"}
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader aria-label="telemetry records table">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Event Type</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Source ID</TableCell>
                  <TableCell>Frame ID</TableCell>
                  <TableCell>Properties</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {databaseRecords.map((record) => (
                  <TableRow
                    key={record.id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {record.id}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getEventTypeName(record.type)}
                        color={
                          record.type === 0 ? "primary" : 
                          record.type === 1 ? "secondary" : 
                          record.type === 2 ? "success" : "default"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatTimestamp(record.timestamp)}</TableCell>
                    <TableCell>{record.source_id}</TableCell>
                    <TableCell>{record.frame_id || 'N/A'}</TableCell>
                    <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={typeof record.properties === 'object' ? JSON.stringify(record.properties, null, 2) : record.properties} arrow>
                        <span>{typeof record.properties === 'object' ? JSON.stringify(record.properties) : record.properties}</span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            rowsPerPageOptions={[5, 10, 25, 50, 100]}
            count={totalEvents}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
    </Paper>
  );
};

export default RawTelemetryTable;