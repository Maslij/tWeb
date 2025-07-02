import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Tooltip,
  Autocomplete,
  TextField,
  FormControl,
  useTheme
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface ClassSelectorProps {
  triggering_classes: string[];
  onUpdateClasses: (newClasses: string[]) => void;
  disabled?: boolean;
  index: number;
  availableClasses: string[];
}

const ClassSelector: React.FC<ClassSelectorProps> = ({
  triggering_classes,
  onUpdateClasses,
  disabled = false,
  index,
  availableClasses
}) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();

  // Filter out already selected classes from available options
  const unselectedClasses = availableClasses.filter(
    cls => !triggering_classes.includes(cls)
  );

  const handleClassChange = (event: any, newValue: string[]) => {
    onUpdateClasses(newValue);
  };

  const handleDeleteClass = (classToDelete: string) => {
    const newClasses = triggering_classes.filter(cls => cls !== classToDelete);
    onUpdateClasses(newClasses);
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Triggering Classes
        </Typography>
        {triggering_classes.length > 0 && (
          <Chip 
            size="small" 
            label={`${triggering_classes.length} selected`} 
            color="primary" 
            variant="filled"
            sx={{ 
              ml: 1, 
              height: '20px', 
              fontSize: '0.7rem',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.dark'
              }
            }}
          />
        )}
        <Tooltip title="Select which object classes can trigger events for this zone. If none are selected, all classes will trigger events. Only objects of the selected classes will be counted for zone crossings." arrow>
          <HelpOutlineIcon sx={{ fontSize: 16, ml: 0.5, color: 'text.secondary' }} />
        </Tooltip>
      </Box>
      
      <FormControl fullWidth size="small">
        <Autocomplete
          multiple
          size="small"
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          options={unselectedClasses}
          value={triggering_classes}
          onChange={handleClassChange}
          disabled={disabled}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...otherProps } = getTagProps({ index });
              return (
                <Chip
                  key={key}
                  variant="filled"
                  label={option}
                  size="small"
                  color="success"
                  {...otherProps}
                  onDelete={() => handleDeleteClass(option)}
                  sx={{
                    bgcolor: 'success.main',
                    color: 'success.contrastText',
                    fontWeight: 500,
                    '&:hover': {
                      bgcolor: 'success.dark',
                    },
                    '& .MuiChip-deleteIcon': {
                      color: 'success.contrastText',
                      '&:hover': {
                        color: 'error.light',
                      }
                    }
                  }}
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={
                availableClasses.length === 0 
                  ? "No classes selected in object detector" 
                  : triggering_classes.length === 0 
                    ? "All classes (default)" 
                    : "Add class..."
              }
              variant="outlined"
              size="small"
            />
          )}
          renderOption={(props, option) => {
            const { key, ...otherProps } = props;
            return (
              <li key={key} {...otherProps}>
                {option}
              </li>
            );
          }}
          noOptionsText={
            availableClasses.length === 0 
              ? "Select classes in Object Detector first" 
              : unselectedClasses.length === 0
                ? "All classes already selected"
                : "No classes available"
          }
          sx={{ mt: 0.5 }}
        />
      </FormControl>
      
      {availableClasses.length === 0 ? (
        <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
          Configure classes in Object Detector to enable class filtering
        </Typography>
      ) : triggering_classes.length === 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          All detected classes ({availableClasses.join(', ')}) will trigger events
        </Typography>
      ) : (
        <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block', fontWeight: 500 }}>
          Only {triggering_classes.join(', ')} will trigger events
        </Typography>
      )}
    </Box>
  );
};

export default ClassSelector; 