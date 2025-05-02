import {
  IconButton as MuiIconButton,
  IconButtonProps as MuiIconButtonProps,
  styled,
  CircularProgress
} from '@mui/material';

export interface IconButtonProps extends MuiIconButtonProps {
  loading?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const sizeMap = {
  small: 32,
  medium: 40,
  large: 48
};

const StyledIconButton = styled(MuiIconButton, {
  shouldForwardProp: (prop) => prop !== 'loading'
})<IconButtonProps>(({ theme, size = 'medium' }) => ({
  borderRadius: '50%',
  width: sizeMap[size],
  height: sizeMap[size],
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const IconButton = (props: IconButtonProps) => {
  const { loading, children, ...rest } = props;
  
  return (
    <StyledIconButton disabled={props.disabled || loading} {...rest}>
      {loading ? (
        <CircularProgress size={sizeMap[props.size || 'medium'] / 2.5} color="inherit" />
      ) : (
        children
      )}
    </StyledIconButton>
  );
};

export default IconButton; 