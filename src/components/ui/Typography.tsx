import {
  Typography as MuiTypography,
  TypographyProps as MuiTypographyProps,
  styled
} from '@mui/material';

export interface TypographyProps extends MuiTypographyProps {
  truncate?: boolean;
  ellipsis?: boolean;
  lineClamp?: number;
}

const StyledTypography = styled(MuiTypography, {
  shouldForwardProp: (prop) => 
    !['truncate', 'ellipsis', 'lineClamp'].includes(prop as string)
})<TypographyProps>(({ truncate, ellipsis, lineClamp, theme }) => ({
  ...(truncate && {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  }),
  ...(ellipsis && {
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  }),
  ...(lineClamp && {
    display: '-webkit-box',
    WebkitLineClamp: lineClamp,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  }),
}));

export const Typography = (props: TypographyProps) => {
  return <StyledTypography {...props} />;
};

export default Typography; 