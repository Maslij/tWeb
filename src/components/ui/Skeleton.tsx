import {
  Skeleton as MuiSkeleton,
  SkeletonProps as MuiSkeletonProps,
  styled
} from '@mui/material';

export interface SkeletonProps extends MuiSkeletonProps {
  rounded?: boolean;
  borderRadius?: number | string;
}

const StyledSkeleton = styled(MuiSkeleton, {
  shouldForwardProp: (prop) => !['rounded', 'borderRadius'].includes(prop as string)
})<SkeletonProps>(({ rounded, borderRadius, theme }) => ({
  ...(rounded && {
    borderRadius: 8,
  }),
  ...(borderRadius !== undefined && {
    borderRadius: typeof borderRadius === 'number' ? borderRadius : borderRadius,
  }),
}));

export const Skeleton = (props: SkeletonProps) => {
  return <StyledSkeleton animation="wave" {...props} />;
};

export default Skeleton; 