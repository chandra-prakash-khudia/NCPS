import React from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...', fullScreen = false }) => {
  const sizeMap = { small: 28, medium: 40, large: 56 };
  const circularSize = sizeMap[size] || 40;

  const content = (
    <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ py: fullScreen ? 0 : 6 }}>
      <Box sx={{ position: 'relative' }}>
        <CircularProgress
          size={circularSize}
          thickness={3}
          sx={{
            color: 'primary.main',
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 4,
            borderRadius: '50%',
            border: '2px solid',
            borderColor: 'rgba(99,102,241,0.15)',
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
