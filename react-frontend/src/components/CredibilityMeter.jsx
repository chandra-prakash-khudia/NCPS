import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { getCredibilityColor } from '../utils/helpers';

const CredibilityMeter = ({ score = 0.5, size = 'medium', showLabel = true }) => {
  const pct = Math.round(score * 100);
  const sizeMap = { small: 50, medium: 74, large: 104 };
  const dim = sizeMap[size] || 74;
  const strokeWidth = size === 'small' ? 4 : size === 'large' ? 7 : 5.5;
  const radius = (dim - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - score * circumference;

  const color = getCredibilityColor(score);

  return (
    <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ position: 'relative', width: dim, height: dim }}>
        <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke={alpha(color, 0.16)}
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
            style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Typography
            sx={{
              fontFamily: 'var(--mono)',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 700,
              lineHeight: 1,
              fontSize: size === 'small' ? '0.78rem' : size === 'large' ? '1.5rem' : '1.05rem',
              color,
            }}
          >
            {pct}
          </Typography>
          {size === 'large' && (
            <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', fontWeight: 600, mt: 0.2 }}>
              / 100
            </Typography>
          )}
        </Box>
      </Box>
      {showLabel && (
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.6rem' }}
        >
          Credibility
        </Typography>
      )}
    </Box>
  );
};

export default CredibilityMeter;
