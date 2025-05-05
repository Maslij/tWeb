import React from 'react';
import {
  Typography as MuiTypography,
  TypographyProps as MuiTypographyProps,
  styled
} from '@mui/material';

export type TypographyProps = MuiTypographyProps & {
  truncate?: boolean;
  ellipsis?: boolean;
  lineClamp?: number;
};

const StyledTypography = styled(MuiTypography, {
  shouldForwardProp: (prop) => 
    !['truncate', 'ellipsis', 'lineClamp'].includes(prop as string)
})<TypographyProps>(({ truncate, ellipsis, lineClamp, theme, variant }) => ({
  // Default font family is Inter (secondary)
  fontFamily: 'Inter, sans-serif',
  
  // Apply Montserrat to headings
  ...(variant === 'h1' && {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 700,
    fontSize: '2.5rem',
    lineHeight: 1.2
  }),
  ...(variant === 'h2' && {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 700,
    fontSize: '2rem',
    lineHeight: 1.2
  }),
  ...(variant === 'h3' && {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 700,
    fontSize: '1.75rem',
    lineHeight: 1.2
  }),
  ...(variant === 'h4' && {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 700,
    fontSize: '1.5rem',
    lineHeight: 1.2
  }),
  ...(variant === 'h5' && {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 600,
    fontSize: '1.25rem',
    lineHeight: 1.2
  }),
  ...(variant === 'h6' && {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 600,
    fontSize: '1rem',
    lineHeight: 1.2
  }),
  
  // Apply Montserrat to subtitles but with semibold weight
  ...(variant === 'subtitle1' && {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 600,
    fontSize: '1rem',
  }),
  ...(variant === 'subtitle2' && {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 600,
    fontSize: '0.875rem',
  }),
  
  // Body text uses Inter
  ...(variant === 'body1' && {
    fontFamily: 'Inter, sans-serif',
    fontSize: '1rem',
    lineHeight: 1.5,
  }),
  ...(variant === 'body2' && {
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.875rem',
    lineHeight: 1.5,
  }),
  
  // Other variants use Inter
  ...(variant === 'button' && {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 600,
    textTransform: 'none',
  }),
  ...(variant === 'caption' && {
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.75rem',
  }),
  ...(variant === 'overline' && {
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: 1
  }),
  
  // Handle text truncation/ellipsis
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

export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  (props, ref) => {
    return <StyledTypography ref={ref} {...props} />;
  }
);

Typography.displayName = 'Typography';

export default Typography; 