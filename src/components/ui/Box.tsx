import { Box as MuiBox, BoxProps as MuiBoxProps, styled } from '@mui/material';

export interface BoxProps extends MuiBoxProps {}

const StyledBox = styled(MuiBox)({
  // You can add default styling for all Box components here
});

export const Box = (props: BoxProps) => {
  return <StyledBox {...props} />;
};

export default Box; 