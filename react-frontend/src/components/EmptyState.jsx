import React from 'react';
import { Box, Stack, Typography, alpha } from '@mui/material';

/**
 * Friendly empty / zero-data state with an icon chip, message, and optional CTA.
 */
const EmptyState = ({ icon, title, description, action, dense = false }) => (
  <Box
    className="glass-surface"
    sx={{
      textAlign: 'center',
      px: { xs: 3, md: 5 },
      py: dense ? { xs: 4, md: 5 } : { xs: 6, md: 8 },
    }}
  >
    <Stack alignItems="center" spacing={1.5}>
      {icon && (
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            display: 'grid',
            placeItems: 'center',
            color: 'primary.main',
            bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.1),
            border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.24)}`,
          }}
        >
          {icon}
        </Box>
      )}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 420, mx: 'auto' }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  </Box>
);

export default EmptyState;
