import {
  Card as MuiCard,
  CardProps as MuiCardProps,
  CardContent as MuiCardContent,
  CardContentProps as MuiCardContentProps,
  CardActions as MuiCardActions,
  CardActionsProps as MuiCardActionsProps,
  styled
} from '@mui/material';

// Card component
export interface CardProps extends MuiCardProps {
  elevation?: number;
  noPadding?: boolean;
}

const StyledCard = styled(MuiCard, {
  shouldForwardProp: (prop) => prop !== 'noPadding'
})<CardProps>(({ noPadding, theme }) => ({
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
  },
  ...(noPadding && {
    padding: 0
  })
}));

export const Card = (props: CardProps) => {
  const { elevation = 1, ...rest } = props;
  return <StyledCard elevation={elevation} {...rest} />;
};

// CardContent component
export interface CardContentProps extends MuiCardContentProps {
  noPadding?: boolean;
}

const StyledCardContent = styled(MuiCardContent, {
  shouldForwardProp: (prop) => prop !== 'noPadding'
})<CardContentProps>(({ noPadding, theme }) => ({
  padding: noPadding ? 0 : theme.spacing(2),
  '&:last-child': {
    paddingBottom: noPadding ? 0 : theme.spacing(2),
  }
}));

export const CardContent = (props: CardContentProps) => {
  return <StyledCardContent {...props} />;
};

// CardActions component
export interface CardActionsProps extends MuiCardActionsProps {
  spacing?: number;
}

const StyledCardActions = styled(MuiCardActions, {
  shouldForwardProp: (prop) => prop !== 'spacing'
})<CardActionsProps>(({ spacing = 1, theme }) => ({
  padding: theme.spacing(1, 2),
  gap: theme.spacing(spacing),
}));

export const CardActions = (props: CardActionsProps) => {
  return <StyledCardActions {...props} />;
};

export default {
  Card,
  CardContent,
  CardActions
}; 