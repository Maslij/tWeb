import React from 'react';
import { Box } from '../../components/ui/Box';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  sx?: object;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, sx = {}, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pipeline-tabpanel-${index}`}
      aria-labelledby={`pipeline-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ ...sx }}>{children}</Box>}
    </div>
  );
};

export default TabPanel; 