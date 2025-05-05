import React from 'react';
import {
  TextField as MuiTextField,
  TextFieldProps as MuiTextFieldProps,
  styled
} from '@mui/material';

export type TextFieldProps = MuiTextFieldProps & {
  // Add any additional props we might need
};

const StyledTextField = styled(MuiTextField)(({ theme }) => ({
  '& .MuiInputLabel-root': {
    fontFamily: 'Montserrat, sans-serif', 
    fontWeight: 500,
  },
  '& .MuiInputBase-root': {
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.95rem',
  },
  '& .MuiInputBase-input': {
    fontFamily: 'Inter, sans-serif',
  },
  '& .MuiFormHelperText-root': {
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.75rem',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.mode === 'light' 
      ? 'rgba(0, 0, 0, 0.23)' 
      : 'rgba(255, 255, 255, 0.23)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.mode === 'light'
      ? 'rgba(0, 0, 0, 0.38)'
      : 'rgba(255, 255, 255, 0.38)',
  },
  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
  },
}));

export const TextField = React.forwardRef<HTMLDivElement, TextFieldProps>(
  (props, ref) => {
    return <StyledTextField ref={ref} {...props} />;
  }
);

TextField.displayName = 'TextField';

export default TextField; 