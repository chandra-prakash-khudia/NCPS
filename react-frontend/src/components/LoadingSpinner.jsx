import React from 'react';
import { Box, CircularProgress, Stack, Typography, alpha } from '@mui/material';

const LoadingSpinner = ({ size = 'medium', text = 'Loading…', fullScreen = false }) => {
  const sizeMap = { small: 26, medium: 38, large: 52 };
  const circularSize = sizeMap[size] || 38;

  const content = (
    <Stack alignItems="center" justifyContent="center" spacing={1.8} sx={{ py: fullScreen ? 0 : 7 }}>
      <Box sx={{ position: 'relative', width: circularSize, height: circularSize }}>
        <CircularProgress
          size={circularSize}
          thickness={3.4}
          sx={{ color: 'primary.main', '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3.4px solid',
            borderColor: (t) => alpha(t.palette.primary.main, 0.16),
          }}
        />
      </Box>
      {text && (
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {text}
        </Typography>
      )}
    </Stack>
  );

  if (fullScreen) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        {content}
      </Box>
    );
  }

  return content;
};

export default LoadingSpinner;
