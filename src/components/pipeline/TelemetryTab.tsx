import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Alert,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  SelectChangeEvent,
  Stack,
  IconButton
} from '@mui/material';
import Typography from '../../components/ui/Typography';
import Button from '../../components/ui/Button';
import { Line } from 'react-chartjs-2';
import { enUS } from 'date-fns/locale';
import { TelemetryChartSkeleton, DatabaseTableSkeleton } from './SkeletonComponents';
import TuneIcon from '@mui/icons-material/Tune';
import RedoIcon from '@mui/icons-material/Redo';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DatabaseIcon from '@mui/icons-material/Storage';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Camera, EventRecord } from '../../services/api';

interface ZoneLineCount {
  timestamp: number;
  zone_id: string;
  direction: string;
  count: number;
}

interface TelemetryTabProps {
  camera: Camera;
  cameraId: string;
  zoneLineCounts: ZoneLineCount[];
  isLoadingZoneData: boolean;
  isLoadingHeatmapData: boolean;
  fetchZoneLineCounts: () => void;
  fetchClassHeatmapData: () => void;
  databaseRecords: EventRecord[];
  isLoadingRecords: boolean;
  isDeletingRecords: boolean;
  totalEvents: number;
  totalFrames: number;
  page: number;
  rowsPerPage: number;
  handlePageChange: (_event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fetchDatabaseRecords: () => void;
  handleDeleteAllRecords: () => void;
  getEventTypeName: (type: number) => string;
  formatTimestamp: (timestamp: number) => string;
  hasHeatmapData?: boolean;
  hasZoneLineData?: boolean;
}

const TelemetryTab: React.FC<TelemetryTabProps> = ({
  camera,
  cameraId,
  zoneLineCounts,
  isLoadingZoneData,
  isLoadingHeatmapData,
  fetchZoneLineCounts,
  fetchClassHeatmapData,
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
  formatTimestamp,
  hasHeatmapData = true,
  hasZoneLineData = true
}) => {
  // State declaration updates
  const [directionFilter, setDirectionFilter] = React.useState<'all' | 'in' | 'out'>('all');
  
  // Add state for heatmap parameters
  const [heatmapAnchor, setHeatmapAnchor] = React.useState<string>('CENTER');
  const [heatmapQuality, setHeatmapQuality] = React.useState<number>(90);
  const [selectedClasses, setSelectedClasses] = React.useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = React.useState<string[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = React.useState<boolean>(false);

  // Replace the existing useEffect that extracts classes from records with a new one that fetches from API
  React.useEffect(() => {
    // Fetch available classes when camera ID changes or when data changes
    fetchAvailableClasses();
  }, [cameraId, totalEvents]);

  // Add function to fetch available classes
  const fetchAvailableClasses = async () => {
    if (!cameraId) return;
    
    setIsLoadingClasses(true);
    try {
      const response = await fetch(`/api/v1/cameras/${cameraId}/database/available-classes`);
      if (response.ok) {
        const data = await response.json();
        if (data.classes && Array.isArray(data.classes)) {
          setAvailableClasses(data.classes);
          
          // Clear selected classes that are no longer available
          setSelectedClasses(prevSelected => 
            prevSelected.filter(cls => data.classes.includes(cls))
          );
        }
      } else {
        console.error('Failed to fetch available classes');
        setAvailableClasses([]);
      }
    } catch (error) {
      console.error('Error fetching available classes:', error);
      setAvailableClasses([]);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  // Handle class selection change
  const handleClassChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedClasses(typeof value === 'string' ? value.split(',') : value);
  };

  // Handle anchor change
  const handleAnchorChange = (event: SelectChangeEvent) => {
    setHeatmapAnchor(event.target.value);
  };

  // Handle quality change
  const handleQualityChange = (event: SelectChangeEvent) => {
    setHeatmapQuality(Number(event.target.value));
  };

  // Zone Line Counts Chart component
  const ZoneLineCountsChart = () => {
    // Prepare datasets even during loading
    const shouldRenderData = !(!hasZoneLineData || !zoneLineCounts || zoneLineCounts.length === 0);
    
    if (!shouldRenderData && !isLoadingZoneData) {
      return (
        <Box 
          sx={{ 
            textAlign: 'center', 
            p: 3, 
            border: '1px solid #ccc', 
            borderRadius: '4px', 
            height: '400px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}
        >
          <VisibilityIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No zone crossing data available
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {!camera?.running && !totalFrames ? 
              "Start the pipeline at least once to see the zone crossing data" : 
              "Add line zones in the configuration to start collecting crossing data"}
          </Typography>
        </Box>
      );
    }

    // Only prepare chart data if we have data to show
    let chartData: { datasets: any[] } = { datasets: [] };
    let options = {};
    
    if (shouldRenderData) {
      // Filter data based on selected direction
      const filteredData = directionFilter === 'all' 
        ? zoneLineCounts 
        : zoneLineCounts.filter(item => item.direction === directionFilter);

      // Group data by zone_id
      const zones = [...new Set(filteredData.map(item => item.zone_id))];
      
      // Prepare datasets for the chart
      const datasets = directionFilter !== 'all'
        ? zones.map((zoneId, index) => {
            // Filter data for this zone 
            const zoneData = filteredData.filter(item => item.zone_id === zoneId);
            
            // Group by timestamp to combine counts with the same timestamp
            const groupedByTimestamp = zoneData.reduce((acc, item) => {
              const existingPoint = acc.find(p => p.timestamp === item.timestamp);
              if (existingPoint) {
                existingPoint.count += item.count;
              } else {
                acc.push({...item});
              }
              return acc;
            }, [] as ZoneLineCount[]);

            // Generate a color based on index
            const hue = (index * 137) % 360;
            const color = `hsl(${hue}, 70%, 50%)`;
            
            // Add direction to label if showing a specific direction
            const directionSuffix = ` (${directionFilter})`;
            
            return {
              label: `Zone: ${zoneId}${directionSuffix}`,
              data: groupedByTimestamp.map(item => ({
                x: item.timestamp,
                y: item.count
              })),
              borderColor: color,
              backgroundColor: `${color}80`,
              fill: false,
              tension: 0.1
            };
          })
        : zones.flatMap((zoneId, index) => {
            // For 'all' directions, create separate datasets for 'in' and 'out'
            const baseHue = (index * 137) % 360;
            
            // Get data for this zone, filtered by direction
            const inData = zoneLineCounts.filter(item => 
              item.zone_id === zoneId && item.direction === 'in');
            
            const outData = zoneLineCounts.filter(item => 
              item.zone_id === zoneId && item.direction === 'out');
            
            // Return array with two datasets (one for each direction)
            return [
              {
                label: `Zone: ${zoneId} (in)`,
                data: inData.map(item => ({
                  x: item.timestamp,
                  y: item.count
                })),
                borderColor: `hsl(${baseHue}, 70%, 50%)`,
                backgroundColor: `hsl(${baseHue}, 70%, 50%, 0.5)`,
                fill: false,
                tension: 0.1
              },
              {
                label: `Zone: ${zoneId} (out)`,
                data: outData.map(item => ({
                  x: item.timestamp,
                  y: item.count
                })),
                borderColor: `hsl(${baseHue + 40}, 70%, 50%)`,
                backgroundColor: `hsl(${baseHue + 40}, 70%, 50%, 0.5)`,
                fill: false,
                tension: 0.1,
                borderDash: [5, 5] // Add dashed line for 'out' direction
              }
            ];
          });
      
      chartData = {
        datasets
      };
      
      options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time' as const,
            time: {
              unit: 'hour' as const,
              tooltipFormat: 'MMM d, yyyy HH:mm',
              displayFormats: {
                hour: 'MMM d, HH:mm'
              }
            },
            title: {
              display: true,
              text: 'Time'
            },
            adapters: {
              date: {
                locale: enUS
              }
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Count'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top' as const,
          },
          title: {
            display: true,
            text: directionFilter === 'all' 
              ? 'Zone Crossing Counts Over Time' 
              : `Zone Crossing Counts Over Time (${directionFilter.charAt(0).toUpperCase() + directionFilter.slice(1)} Direction)`
          },
          tooltip: {
            callbacks: {
              title: function(tooltipItems: any) {
                // Format the timestamp
                const date = new Date(tooltipItems[0].parsed.x);
                return date.toLocaleString();
              }
            }
          }
        }
      };
    }
    
    return (
      <Box height={400} width="100%" position="relative">
        {shouldRenderData && <Line data={chartData} options={options} />}
        
        {isLoadingZoneData && (
          <Box 
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bgcolor="transparent"
            zIndex={10}
          >
            <CircularProgress />
          </Box>
        )}
        
        {!shouldRenderData && isLoadingZoneData && <TelemetryChartSkeleton />}
      </Box>
    );
  };

  // Class Heatmap Visualization component
  const ClassHeatmapVisualization = () => {
    // Check if we have heatmap data
    const shouldRenderData = hasHeatmapData && totalFrames > 0;
    
    if (!shouldRenderData && !isLoadingHeatmapData) {
      return (
        <Box 
          sx={{ 
            textAlign: 'center', 
            p: 3, 
            border: '1px solid #ccc', 
            borderRadius: '4px', 
            height: '400px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}
        >
          <VisibilityIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No heatmap data available
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {!camera?.running && !totalFrames ? 
              "Start the pipeline at least once to generate heatmap data" : 
              "Wait for more detection events to generate a heatmap"}
          </Typography>
        </Box>
      );
    }

    // Generate the heatmap image URL with parameters
    const buildHeatmapUrl = () => {
      let url = `/api/v1/cameras/${cameraId}/database/heatmap-image?quality=${heatmapQuality}&anchor=${heatmapAnchor}`;
      
      // Add class filters if selected
      if (selectedClasses.length > 0) {
        const classParam = selectedClasses.map(encodeURIComponent).join(',');
        url += `&class=${classParam}`;
      }
      
      // Add timestamp to prevent caching
      url += `&t=${new Date().getTime()}`;
      
      return url;
    };

    const heatmapImageUrl = cameraId ? buildHeatmapUrl() : '';

    if (!heatmapImageUrl && !isLoadingHeatmapData) {
      return (
        <Box 
          sx={{ 
            textAlign: 'center', 
            p: 3, 
            border: '1px solid #ccc', 
            borderRadius: '4px', 
            height: '400px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Unable to generate heatmap URL
          </Typography>
        </Box>
      );
    }

    return (
      <>
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {/* Anchor point selection */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="anchor-select-label">Anchor Point</InputLabel>
            <Select
              labelId="anchor-select-label"
              id="anchor-select"
              value={heatmapAnchor}
              label="Anchor Point"
              onChange={handleAnchorChange}
            >
              <MenuItem value="CENTER">Center</MenuItem>
              <MenuItem value="BOTTOM_CENTER">Bottom Center</MenuItem>
              <MenuItem value="TOP_CENTER">Top Center</MenuItem>
              <MenuItem value="LEFT_CENTER">Left Center</MenuItem>
              <MenuItem value="RIGHT_CENTER">Right Center</MenuItem>
              <MenuItem value="TOP_LEFT">Top Left</MenuItem>
              <MenuItem value="TOP_RIGHT">Top Right</MenuItem>
              <MenuItem value="BOTTOM_LEFT">Bottom Left</MenuItem>
              <MenuItem value="BOTTOM_RIGHT">Bottom Right</MenuItem>
            </Select>
          </FormControl>

          {/* Image quality selection */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="quality-select-label">Quality</InputLabel>
            <Select
              labelId="quality-select-label"
              id="quality-select"
              value={heatmapQuality.toString()}
              label="Quality"
              onChange={handleQualityChange}
            >
              <MenuItem value="70">Low</MenuItem>
              <MenuItem value="85">Medium</MenuItem>
              <MenuItem value="95">High</MenuItem>
              <MenuItem value="100">Best</MenuItem>
            </Select>
          </FormControl>

          {/* Class filter selection */}
          <FormControl size="small" sx={{ minWidth: 200, maxWidth: 300 }}>
            <InputLabel id="class-filter-label">Class Filter</InputLabel>
            <Select
              labelId="class-filter-label"
              id="class-filter"
              multiple
              value={selectedClasses}
              onChange={handleClassChange}
              input={<OutlinedInput label="Class Filter" />}
              renderValue={(selected) => selected.join(', ')}
              startAdornment={isLoadingClasses ? (
                <CircularProgress size={18} sx={{ mr: 1 }} />
              ) : null}
              endAdornment={
                <Tooltip title="Refresh available classes">
                  <IconButton 
                    size="small" 
                    sx={{ ml: -1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchAvailableClasses();
                    }}
                  >
                    <RedoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
              disabled={isLoadingClasses}
            >
              {availableClasses.length === 0 ? (
                <MenuItem disabled>
                  <em>No classes available</em>
                </MenuItem>
              ) : (
                availableClasses.map((name) => (
                  <MenuItem key={name} value={name}>
                    <Checkbox checked={selectedClasses.indexOf(name) > -1} />
                    <ListItemText primary={name} />
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Box>
        
        <Box 
          sx={{ 
            height: 400, 
            width: "100%", 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            position: 'relative'
          }}
        >
          {shouldRenderData && (
            <img 
              id="heatmap-image"
              src={heatmapImageUrl}
              alt="Detection Heatmap" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain'
              }}
              onError={(e) => {
                // Handle image load error
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                // Show error message
                const errorDiv = document.createElement('div');
                errorDiv.textContent = 'Failed to load heatmap image. No data may be available yet.';
                errorDiv.style.color = '#666';
                errorDiv.style.textAlign = 'center';
                errorDiv.style.padding = '20px';
                target.parentNode?.appendChild(errorDiv);
              }}
            />
          )}
          
          {isLoadingHeatmapData && (
            <Box 
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              bgcolor="transparent"
              zIndex={10}
            >
              <CircularProgress />
            </Box>
          )}
          
          {!shouldRenderData && isLoadingHeatmapData && <TelemetryChartSkeleton />}
        </Box>
      </>
    );
  };

  return (
    <>
      {/* Analytics Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TuneIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Analytics
            {!camera?.running && totalFrames > 0 && " (Last Frame)"}
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {camera?.running && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Automatic refreshing has been disabled. Use the refresh buttons to manually update the data.
          </Alert>
        )}
        
        <Typography variant="body2" color="text.secondary" paragraph>
          View analytics and metrics generated from your pipeline. Line crossing counts and object heatmaps help visualize traffic patterns.
          {camera?.running ? 
            " You can refresh the data while the pipeline is running." : 
            " The pipeline is currently stopped, but you can still view previously collected data."}
        </Typography>
          
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Line Zone Crossing Counts
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Direction filter buttons */}
              <Box sx={{ display: 'flex', mr: 2 }}>
                <Button
                  variant={directionFilter === 'all' ? "contained" : "outlined"}
                  onClick={() => setDirectionFilter('all')}
                  size="small"
                  sx={{ borderRadius: '4px 0 0 4px' }}
                >
                  All
                </Button>
                <Button
                  variant={directionFilter === 'in' ? "contained" : "outlined"}
                  onClick={() => setDirectionFilter('in')}
                  size="small"
                  sx={{ borderRadius: 0 }}
                >
                  In
                </Button>
                <Button
                  variant={directionFilter === 'out' ? "contained" : "outlined"}
                  onClick={() => setDirectionFilter('out')}
                  size="small"
                  sx={{ borderRadius: '0 4px 4px 0' }}
                >
                  Out
                </Button>
              </Box>
              <Button
                variant="contained"
                startIcon={isLoadingZoneData ? <CircularProgress size={20} /> : <RedoIcon />}
                onClick={fetchZoneLineCounts}
                disabled={isLoadingZoneData}
                size="small"
              >
                Refresh
              </Button>
            </Box>
          </Box>
          <ZoneLineCountsChart />
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Object Detection Heatmap
            </Typography>
            <Button
              variant="contained"
              startIcon={isLoadingHeatmapData ? <CircularProgress size={20} /> : <RedoIcon />}
              onClick={() => {
                fetchClassHeatmapData();
                fetchAvailableClasses(); // Also refresh available classes
              }}
              disabled={isLoadingHeatmapData || isLoadingClasses}
              size="small"
            >
              Refresh
            </Button>
          </Box>
          <ClassHeatmapVisualization />
        </Box>
      </Paper>

      {/* Telemetry Records Section */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <DatabaseIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Telemetry Records
            {totalEvents > 0 && !camera?.running && " (Last Frame)"}
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <Typography variant="body2" color="text.secondary" paragraph>
          View and manage detailed telemetry records from your pipeline. These records show events captured during processing.
          {camera?.running ? 
            " New records are being collected as the pipeline runs." : 
            " The pipeline is currently stopped, but you can still view previously collected records."}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3, gap: 2 }}>
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
                "Start the pipeline at least once to collect telemetry records" : 
                "No records have been collected yet"}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} sx={{ maxHeight: 440 }}>
              <Table stickyHeader aria-label="telemetry records table">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Source</TableCell>
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
                      <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Tooltip title={record.properties} arrow>
                          <span>{record.properties}</span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              rowsPerPageOptions={[5, 10, 25, 50]}
              count={totalEvents}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>
    </>
  );
};

export default TelemetryTab; 