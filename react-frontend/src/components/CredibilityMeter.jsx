import React from 'react';
import { Box, Typography, alpha } from '@mui/material';

const CredibilityMeter = ({ score = 0.5, size = 'medium', showLabel = true }) => {
  const pct = Math.round(score * 100);
  const sizeMap = { small: 52, medium: 72, large: 96 };
  const dim = sizeMap[size] || 72;
  const strokeWidth = size === 'small' ? 4 : 5;
  const radius = (dim - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score * circumference);

  const color = score >= 0.7 ? '#10b981' : score >= 0.4 ? '#f59e0b' : '#ef4444';
  const bgColor = alpha(color, 0.15);

  return (
    <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ position: 'relative', width: dim, height: dim }}>
        <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke={bgColor}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: size === 'small' ? '0.7rem' : size === 'large' ? '1.2rem' : '0.9rem',
              color,
            }}
          >
            {pct}
          </Typography>
        </Box>
      </Box>
      {showLabel && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontSize: '0.6rem',
          }}
        >
          Credibility
        </Typography>
      )}
    </Box>
  );
};

export default CredibilityMeter;
