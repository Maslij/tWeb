import {
  Divider as MuiDivider,
  DividerProps as MuiDividerProps,
  styled
} from '@mui/material';

export interface DividerProps extends MuiDividerProps {
  spacing?: number;
}

const StyledDivider = styled(MuiDivider, {
  shouldForwardProp: (prop) => prop !== 'spacing'
})<DividerProps>(({ spacing = 1, theme, orientation = 'horizontal' }) => ({
  ...(orientation === 'horizontal' && {
    marginTop: theme.spacing(spacing),
    marginBottom: theme.spacing(spacing),
  }),
  ...(orientation === 'vertical' && {
    marginLeft: theme.spacing(spacing),
    marginRight: theme.spacing(spacing),
  }),
}));

export const Divider = (props: DividerProps) => {
  return <StyledDivider {...props} />;
};

export default Divider; 