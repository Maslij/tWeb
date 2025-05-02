import {
  List as MuiList,
  ListProps as MuiListProps,
  ListItem as MuiListItem,
  ListItemProps as MuiListItemProps,
  ListItemText as MuiListItemText,
  ListItemTextProps as MuiListItemTextProps,
  ListItemSecondaryAction as MuiListItemSecondaryAction,
  ListItemSecondaryActionProps as MuiListItemSecondaryActionProps,
  styled
} from '@mui/material';

// List component
export interface ListProps extends MuiListProps {
  compact?: boolean;
  spacing?: number;
}

const StyledList = styled(MuiList, {
  shouldForwardProp: (prop) => !['compact', 'spacing'].includes(prop as string)
})<ListProps>(({ compact, spacing = 0, theme }) => ({
  padding: compact ? theme.spacing(0.5) : theme.spacing(1),
  '& > .MuiListItem-root:not(:last-child)': {
    marginBottom: theme.spacing(spacing),
  }
}));

export const List = (props: ListProps) => {
  return <StyledList {...props} />;
};

// ListItem component
export interface ListItemProps extends MuiListItemProps {
  active?: boolean;
  highlight?: boolean;
}

const StyledListItem = styled(MuiListItem, {
  shouldForwardProp: (prop) => !['active', 'highlight'].includes(prop as string)
})<ListItemProps>(({ active, highlight, theme }) => ({
  borderRadius: 4,
  transition: 'background-color 0.2s ease',
  ...(active && {
    backgroundColor: theme.palette.action.selected,
  }),
  ...(highlight && {
    backgroundColor: theme.palette.action.hover,
  }),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  }
}));

export const ListItem = (props: ListItemProps) => {
  return <StyledListItem {...props} />;
};

// ListItemText component
export interface ListItemTextProps extends MuiListItemTextProps {
  ellipsis?: boolean;
}

const StyledListItemText = styled(MuiListItemText, {
  shouldForwardProp: (prop) => prop !== 'ellipsis'
})<ListItemTextProps>(({ ellipsis }) => ({
  ...(ellipsis && {
    '& .MuiListItemText-primary, & .MuiListItemText-secondary': {
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    }
  })
}));

export const ListItemText = (props: ListItemTextProps) => {
  return <StyledListItemText {...props} />;
};

// ListItemSecondaryAction component
export interface ListItemSecondaryActionProps extends MuiListItemSecondaryActionProps {
  spacing?: number;
}

const StyledListItemSecondaryAction = styled(MuiListItemSecondaryAction, {
  shouldForwardProp: (prop) => prop !== 'spacing'
})<ListItemSecondaryActionProps>(({ spacing = 1, theme }) => ({
  right: theme.spacing(spacing),
}));

export const ListItemSecondaryAction = (props: ListItemSecondaryActionProps) => {
  return <StyledListItemSecondaryAction {...props} />;
};

export default {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
}; 