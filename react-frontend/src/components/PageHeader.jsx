import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

/**
 * Consistent page heading: optional eyebrow, title, supporting line, and a
 * right-aligned actions slot. Keeps every route visually aligned.
 */
const PageHeader = ({ eyebrow, title, subtitle, actions, icon }) => (
  <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
      justifyContent="space-between"
      spacing={1.5}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && (
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', display: 'block', mb: 0.4 }}
          >
            {eyebrow}
          </Typography>
        )}
        <Stack direction="row" spacing={1.25} alignItems="center">
          {icon}
          <Typography variant="h4" sx={{ fontSize: { xs: '1.45rem', md: '1.85rem' } }}>
            {title}
          </Typography>
        </Stack>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 680, fontSize: '0.92rem' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          {actions}
        </Stack>
      )}
    </Stack>
  </Box>
);

export default PageHeader;
