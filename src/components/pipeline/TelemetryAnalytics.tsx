import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
  Tab,
  Tabs,
  Paper,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import apiService from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

interface TelemetryAnalyticsProps {
  cameraId: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TelemetryAnalytics: React.FC<TelemetryAnalyticsProps> = ({ cameraId }) => {
  const { effectiveTheme } = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date range state
  const [startDate, setStartDate] = useState<Date | null>(
    new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
  );
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [useCustomRange, setUseCustomRange] = useState(false);
  
  // Analytics data
  const [analytics, setAnalytics] = useState<any>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [dwellTimeData, setDwellTimeData] = useState<any[]>([]);

  // Event type mapping
  const getEventTypeName = (type: number) => {
    switch (type) {
      case 0: return 'Detection';
      case 1: return 'Tracking';
      case 2: return 'Crossing';
      case 3: return 'Classification';
      case 4: return 'Polygon Events';
      default: return 'Unknown';
    }
  };

  // Color mapping for event types
  const eventTypeColors = {
    0: '#2196F3', // Detection - Blue
    1: '#4CAF50', // Tracking - Green
    2: '#FF9800', // Crossing - Orange
    3: '#9C27B0', // Classification - Purple
    4: '#E91E63', // Polygon Events - Pink
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Only use time range if custom range is enabled AND we have valid dates
      let timeRange: {start: number, end: number} | undefined = undefined;
      
      if (useCustomRange && startDate && endDate) {
        const startTime = startDate.getTime();
        const endTime = endDate.getTime();
        
        // Ensure we have a valid time range
        if (startTime > 0 && endTime > 0) {
          timeRange = {
            start: Math.min(startTime, endTime), // Ensure start <= end
            end: Math.max(startTime, endTime)
          };
          console.log('Using custom time range:', timeRange);
        }
      } else {
        console.log('Using default time range (all data)');
      }

      const [analyticsResult, timeSeriesResult, dwellTimeResult] = await Promise.all([
        apiService.database.getAnalytics(cameraId),
        apiService.database.getTimeSeriesData(cameraId, timeRange),
        apiService.database.getDwellTimeAnalytics(cameraId, timeRange)
      ]);

      setAnalytics(analyticsResult);
      setTimeSeriesData(timeSeriesResult);
      setDwellTimeData(dwellTimeResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [cameraId, useCustomRange, startDate, endDate]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Prepare time series chart data
  const prepareTimeSeriesData = () => {
    if (!timeSeriesData.length) return null;

    const datasets: any[] = [];
    const eventTypes = new Set(timeSeriesData.map(d => d.event_type));

    eventTypes.forEach(eventType => {
      const data = timeSeriesData
        .filter(d => d.event_type === eventType)
        .map(d => ({
          x: new Date(d.timestamp),
          y: d.count
        }))
        .sort((a, b) => a.x.getTime() - b.x.getTime());

      datasets.push({
        label: getEventTypeName(eventType),
        data,
        borderColor: eventTypeColors[eventType as keyof typeof eventTypeColors] || '#666',
        backgroundColor: `${eventTypeColors[eventType as keyof typeof eventTypeColors] || '#666'}20`,
        fill: false,
        tension: 0.1,
      });
    });

    return {
      datasets
    };
  };

  // Prepare class distribution chart data
  const prepareClassDistributionData = () => {
    if (!analytics?.class_counts?.length) return null;

    return {
      labels: analytics.class_counts.map((item: any) => item.class_name),
      datasets: [
        {
          data: analytics.class_counts.map((item: any) => item.count),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40',
            '#FF6384',
            '#C9CBCF'
          ],
        }
      ]
    };
  };

  // Prepare dwell time chart data
  const prepareDwellTimeData = () => {
    if (!dwellTimeData.length) return null;

    const groupedByClass = dwellTimeData.reduce((acc, item) => {
      const className = item.class_name || 'Unknown';
      if (!acc[className]) {
        acc[className] = [];
      }
      acc[className].push(item.dwell_time_seconds);
      return acc;
    }, {} as Record<string, number[]>);

    const labels = Object.keys(groupedByClass);
    const avgDwellTimes = labels.map(className => {
      const times = groupedByClass[className];
      return times.reduce((sum: number, time: number) => sum + time, 0) / times.length;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Average Dwell Time (seconds)',
          data: avgDwellTimes,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        }
      ]
    };
  };

  const timeSeriesChartData = prepareTimeSeriesData();
  const classDistributionData = prepareClassDistributionData();
  const dwellTimeChartData = prepareDwellTimeData();

  return (
    <Paper elevation={2} sx={{ mb: 3 }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            Telemetry Analytics
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={useCustomRange}
                  onChange={(e) => setUseCustomRange(e.target.checked)}
                />
              }
              label="Custom Range"
            />
            {useCustomRange && (
              <>
                <TextField
                  label="Start Date"
                  type="datetime-local"
                  value={startDate ? startDate.toISOString().slice(0, 16) : ''}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="End Date"
                  type="datetime-local"
                  value={endDate ? endDate.toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </>
            )}
            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              onClick={fetchAnalytics}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {analytics && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
                <Card sx={{ height: 140 }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <Typography color="text.secondary" gutterBottom>
                      Total Events
                    </Typography>
                    <Typography variant="h4">
                      {analytics.total_events?.toLocaleString() || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
                <Card sx={{ height: 140 }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <Typography color="text.secondary" gutterBottom>
                      Event Types
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, overflow: 'auto', maxHeight: 80 }}>
                      {Object.entries(analytics.event_counts || {}).map(([type, count]) => (
                        <Chip
                          key={type}
                          label={`${getEventTypeName(parseInt(type))}: ${count}`}
                          size="small"
                          style={{
                            backgroundColor: eventTypeColors[parseInt(type) as keyof typeof eventTypeColors] || '#666',
                            color: 'white'
                          }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
                <Card sx={{ height: 140 }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <Typography color="text.secondary" gutterBottom>
                      Unique Classes
                    </Typography>
                    <Typography variant="h4">
                      {analytics.class_counts?.length || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
                <Card sx={{ height: 140 }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <Typography color="text.secondary" gutterBottom>
                      Time Range
                    </Typography>
                    <Typography variant="body2" sx={{ overflow: 'auto', maxHeight: 80 }}>
                      {analytics.min_timestamp ? new Date(analytics.min_timestamp).toLocaleString() : 'N/A'}
                      <br />
                      to
                      <br />
                      {analytics.max_timestamp ? new Date(analytics.max_timestamp).toLocaleString() : 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Box>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab icon={<BarChartIcon />} label="Time Series" />
            <Tab icon={<PieChartIcon />} label="Class Distribution" />
            <Tab icon={<AccessTimeIcon />} label="Dwell Time" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Event Counts Over Time
          </Typography>
          {timeSeriesChartData ? (
            <Box sx={{ height: 400 }}>
              <Line
                key={`time-series-${cameraId}-${tabValue}`}
                data={timeSeriesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        color: effectiveTheme === 'dark' ? '#F7F9FC' : undefined,
                      },
                    },
                    title: {
                      display: true,
                      text: 'Event Activity Over Time',
                      color: effectiveTheme === 'dark' ? '#F7F9FC' : undefined,
                    },
                  },
                  scales: {
                    x: {
                      type: 'time',
                      time: {
                        displayFormats: {
                          hour: 'HH:mm',
                          day: 'MMM dd',
                        },
                      },
                      title: {
                        display: true,
                        text: 'Time',
                        color: effectiveTheme === 'dark' ? '#F7F9FC' : undefined,
                      },
                      ticks: {
                        color: effectiveTheme === 'dark' ? '#F7F9FC' : undefined,
                      },
                      grid: {
                        color: effectiveTheme === 'dark' ? 'rgba(247, 249, 252, 0.1)' : undefined,
                      },
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Event Count',
                        color: effectiveTheme === 'dark' ? '#F7F9FC' : undefined,
                      },
                      ticks: {
                        color: effectiveTheme === 'dark' ? '#F7F9FC' : undefined,
                      },
                      grid: {
                        color: effectiveTheme === 'dark' ? 'rgba(247, 249, 252, 0.1)' : undefined,
                      },
                    },
                  },
                }}
              />
            </Box>
          ) : (
            <Typography>No time series data available</Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Class Distribution
          </Typography>
          {classDistributionData ? (
            <Box sx={{ height: 400, display: 'flex', justifyContent: 'center' }}>
              <Doughnut
                key={`class-distribution-${cameraId}-${tabValue}`}
                data={classDistributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right' as const,
                      labels: {
                        color: effectiveTheme === 'dark' ? '#F7F9FC' : undefined,
                      },
                    },
                    title: {
                      display: true,
                      text: 'Detection Classes Distribution',
                      color: effectiveTheme === 'dark' ? '#F7F9FC' : undefined,
                    },
                  },
                }}
              />
            </Box>
          ) : (
            <Typography>No class distribution data available</Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Average Dwell Time by Class
          </Typography>
          {dwellTimeChartData ? (
            <Box sx={{ height: 400 }}>
              <Bar
                key={`dwell-time-${cameraId}-${tabValue}`}
                data={dwellTimeChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    title: {
                      display: true,
                      text: 'Average Dwell Time by Object Class',
                      color: effectiveTheme === 'dark' ? '#F7F9FC' : undefined,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Dwell Time (seconds)',
                        color: effectiveTheme === 'dark' ? '#F7F9FC' : undefined,
                      },
                      ticks: {
                        color: effectiveTheme === 'dark' ? '#F7F9FC' : undefined,
                      },
                      grid: {
                        color: effectiveTheme === 'dark' ? 'rgba(247, 249, 252, 0.1)' : undefined,
                      },
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Object Class',
                        color: effectiveTheme === 'dark' ? '#F7F9FC' : undefined,
                      },
                      ticks: {
                        color: effectiveTheme === 'dark' ? '#F7F9FC' : undefined,
                      },
                      grid: {
                        color: effectiveTheme === 'dark' ? 'rgba(247, 249, 252, 0.1)' : undefined,
                      },
                    },
                  },
                }}
              />
            </Box>
          ) : (
            <Typography>No dwell time data available</Typography>
          )}
          
          {dwellTimeData.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Recent Dwell Times
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {dwellTimeData.slice(0, 10).map((item, index) => (
                  <Chip
                    key={index}
                    label={`${item.class_name}: ${item.dwell_time_seconds.toFixed(1)}s`}
                    size="small"
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </TabPanel>
      </Box>
    </Paper>
  );
};

export default TelemetryAnalytics; 