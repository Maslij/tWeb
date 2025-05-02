import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Divider,
  Skeleton,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from '@mui/material';

export const ComponentCardSkeleton = () => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Skeleton variant="circular" width={24} height={24} sx={{ mr: 2 }} />
        <Skeleton variant="text" width="60%" height={32} />
      </Box>
      <Skeleton variant="text" width="80%" sx={{ mb: 1 }} />
      <Divider sx={{ my: 1 }} />
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="text" width="30%" />
    </CardContent>
    <CardActions>
      <Skeleton variant="rounded" width={80} height={32} />
      <Skeleton variant="rounded" width={80} height={32} />
    </CardActions>
  </Card>
);

export const ImageSkeleton = () => (
  <Box 
    sx={{ 
      width: '100%', 
      height: '600px', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      border: '1px solid #ccc',
      borderRadius: '4px',
      bgcolor: 'background.paper'
    }}
  >
    <Skeleton variant="rectangular" width="100%" height="100%" animation="wave" />
  </Box>
);

export const LineZoneEditorSkeleton = () => (
  <Box sx={{ height: '500px' }}>
    <Paper sx={{ p: 1, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Skeleton variant="text" width={150} />
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Skeleton variant="rounded" width={100} height={32} />
        <Skeleton variant="rounded" width={120} height={32} />
        <Skeleton variant="circular" width={24} height={24} />
      </Box>
    </Paper>
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, height: 'calc(100% - 50px)' }}>
      <Skeleton variant="rectangular" height="100%" width="70%" animation="wave" />
      <Box sx={{ width: { xs: '100%', md: '30%' }, height: { xs: 'auto', md: '100%' } }}>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="rectangular" height={400} width="100%" animation="wave" />
      </Box>
    </Box>
  </Box>
);

export const TelemetryChartSkeleton = () => (
  <Box height={400} width="100%">
    <Skeleton variant="rectangular" height="100%" width="100%" animation="wave" />
  </Box>
);

export const DatabaseTableSkeleton = () => (
  <>
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3, gap: 2 }}>
      <Skeleton variant="rounded" width={100} height={36} />
      <Skeleton variant="rounded" width={150} height={36} />
    </Box>
    <TableContainer component={Paper} sx={{ maxHeight: 440 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            {[...Array(5)].map((_, i) => (
              <TableCell key={i}>
                <Skeleton variant="text" />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {[...Array(5)].map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {[...Array(5)].map((_, cellIndex) => (
                <TableCell key={cellIndex}>
                  <Skeleton variant="text" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
      <Skeleton variant="rectangular" width={300} height={40} />
    </Box>
  </>
); 