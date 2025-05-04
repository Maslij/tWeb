import React from 'react';
import { Chip, Tooltip, ChipProps } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import VerifiedIcon from '@mui/icons-material/Verified';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import StarIcon from '@mui/icons-material/Star';
import DiamondIcon from '@mui/icons-material/Diamond';

// Define tier config type
interface TierConfig {
  label: string;
  icon: React.ReactElement;
  color: string;
  backgroundColor: string;
  textColor: string;
}

// License tier configurations
export const LICENSE_TIERS: Record<string, TierConfig> = {
  none: {
    label: 'Unlicensed',
    icon: <LockIcon fontSize="small" />,
    color: 'default',
    backgroundColor: '#6e6e6e',
    textColor: '#ffffff'
  },
  basic: {
    label: 'Basic',
    icon: <VerifiedIcon fontSize="small" />,
    color: 'primary',
    backgroundColor: '#2196f3',
    textColor: '#ffffff'
  },
  standard: {
    label: 'Standard',
    icon: <StarIcon fontSize="small" />,
    color: 'info',
    backgroundColor: '#03a9f4',
    textColor: '#ffffff'
  },
  professional: {
    label: 'Pro',
    icon: <WorkspacePremiumIcon fontSize="small" />,
    color: 'secondary',
    backgroundColor: '#673ab7',
    textColor: '#ffffff'
  },
  pro: {
    label: 'Pro',
    icon: <WorkspacePremiumIcon fontSize="small" />,
    color: 'secondary',
    backgroundColor: '#673ab7',
    textColor: '#ffffff'
  },
  business: {
    label: 'Business',
    icon: <StarIcon fontSize="small" />,
    color: 'success',
    backgroundColor: '#388e3c',
    textColor: '#ffffff'
  },
  enterprise: {
    label: 'Enterprise',
    icon: <DiamondIcon fontSize="small" />,
    color: 'warning',
    backgroundColor: '#ff9800',
    textColor: '#ffffff'
  }
};

export type LicenseTier = string;

export interface LicenseBadgeProps {
  tier: LicenseTier;
  isValid?: boolean;
  onClick?: () => void;
  size?: ChipProps['size'];
  style?: React.CSSProperties;
  tooltipText?: string;
  className?: string;
  variant?: ChipProps['variant'];
}

const LicenseBadge: React.FC<LicenseBadgeProps> = ({
  tier,
  isValid = true,
  onClick,
  size = 'small',
  style,
  tooltipText,
  className,
  variant
}) => {
  // Normalize tier to lowercase for matching
  const normalizedTier = (tier || 'none').toLowerCase();
  
  // Get tier configuration or use default for unknown tiers
  const defaultConfig: TierConfig = {
    label: tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Unknown',
    icon: <VerifiedIcon fontSize="small" />,
    color: 'success',
    backgroundColor: '#4caf50',
    textColor: '#ffffff'
  };
  
  const tierConfig = LICENSE_TIERS[normalizedTier] || defaultConfig;

  // Merge valid and invalid states
  const config = isValid 
    ? tierConfig 
    : LICENSE_TIERS.none;

  const chip = (
    <Chip
      icon={config.icon}
      label={config.label}
      size={size}
      variant={variant}
      sx={{ 
        backgroundColor: config.backgroundColor,
        color: config.textColor,
        fontWeight: 'bold',
        '& .MuiChip-icon': { 
          color: config.textColor 
        },
        '&:hover': {
          backgroundColor: isValid ? config.backgroundColor : '#555555',
          opacity: 0.9
        },
        ...style
      }}
      onClick={onClick}
      clickable={!!onClick}
      className={className}
    />
  );

  // Wrap in tooltip if tooltip text is provided
  if (tooltipText) {
    return (
      <Tooltip title={tooltipText}>
        {chip}
      </Tooltip>
    );
  }

  return chip;
};

export default LicenseBadge; 