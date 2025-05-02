import {
  FormHelperText as MuiFormHelperText,
  FormHelperTextProps as MuiFormHelperTextProps,
  styled
} from '@mui/material';

export interface FormHelperTextProps extends MuiFormHelperTextProps {
  dense?: boolean;
}

const StyledFormHelperText = styled(MuiFormHelperText, {
  shouldForwardProp: (prop) => prop !== 'dense'
})<FormHelperTextProps>(({ dense, theme }) => ({
  marginTop: dense ? theme.spacing(0.5) : theme.spacing(1),
  fontSize: '0.75rem',
}));

export const FormHelperText = (props: FormHelperTextProps) => {
  return <StyledFormHelperText {...props} />;
};

export default FormHelperText; 