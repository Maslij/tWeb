import React from 'react';
import { 
  Button as MuiButton, 
  ButtonProps as MuiButtonProps, 
  styled,
  CircularProgress
} from '@mui/material';

export interface ButtonProps extends MuiButtonProps {
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
}

const StyledButton = styled(MuiButton)(({ theme }) => ({
  borderRadius: 4,
  textTransform: 'none',
  fontFamily: 'Montserrat, sans-serif',
  fontWeight: 600,
  '&.MuiButton-sizeLarge': {
    padding: '10px 22px',
    fontSize: '1rem',
  },
  '&.MuiButton-sizeMedium': {
    padding: '8px 16px',
    fontSize: '0.9rem',
  },
  '&.MuiButton-sizeSmall': {
    padding: '4px 10px',
    fontSize: '0.8rem',
  },
  '&.MuiButton-containedPrimary:hover': {
    color: '#ffffff',
  },
  '&.MuiButton-containedSecondary:hover': {
    color: theme.palette.mode === 'light' ? '#ffffff' : '#4A4A4A',
  },
  '&.MuiButton-outlinedPrimary:hover': {
    color: theme.palette.mode === 'light' ? '#1e2c4c' : '#35a098',
  },
  '&.MuiButton-outlinedSecondary:hover': {
    color: theme.palette.mode === 'light' ? '#35a098' : '#b4d457',
  },
  '&.MuiButton-textPrimary:hover': {
    color: theme.palette.mode === 'light' ? '#1e2c4c' : '#35a098',
  },
  '&.MuiButton-textSecondary:hover': {
    color: theme.palette.mode === 'light' ? '#35a098' : '#b4d457',
  },
}));

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    loading, 
    icon, 
    iconPosition = 'start', 
    ...props 
  }: ButtonProps, ref) => {
    return (
      <StyledButton
        ref={ref}
        startIcon={iconPosition === 'start' && icon && !loading ? icon : undefined}
        endIcon={iconPosition === 'end' && icon && !loading ? icon : undefined}
        disabled={props.disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <CircularProgress
              size={20}
              color="inherit"
              sx={{ mr: children ? 1 : 0 }}
            />
            {children}
          </>
        ) : (
          children
        )}
      </StyledButton>
    );
  }
);

Button.displayName = 'Button';

export default Button; 