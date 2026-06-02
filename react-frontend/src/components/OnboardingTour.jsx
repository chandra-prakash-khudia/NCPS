import React, { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, IconButton, MobileStepper, Typography, alpha, useTheme,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import NearMeRoundedIcon from '@mui/icons-material/NearMeRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import HowToVoteRoundedIcon from '@mui/icons-material/HowToVoteRounded';
import { getPrefs, savePrefs } from '../services/api';
import { useAuth } from '../context/AuthContext';

const steps = [
  {
    Icon: ShieldRoundedIcon,
    title: 'Welcome to NCPS',
    body: 'A trust-aware feed for local news. Every report carries a live credibility score computed from community votes, contributor reliability, and network signals — not raw engagement.',
  },
  {
    Icon: NearMeRoundedIcon,
    title: 'News from where you are',
    body: 'Allow location to see hyperlocal reports first, or switch to the global feed anytime. Filter by category and distance, and open the map to see what is happening nearby.',
  },
  {
    Icon: HowToVoteRoundedIcon,
    title: 'Your vote is weighted',
    body: 'Confirming or disputing a report feeds the credibility engine. The more reliably you vote, the more your judgement counts — and coordinated manipulation is detected and discounted.',
  },
  {
    Icon: InsightsRoundedIcon,
    title: 'See the reasoning',
    body: 'Open any report to read its decision trace: how credibility was reached, which gates passed, and why an alert did or did not fire. Press ⌘K anytime to search or jump anywhere.',
  },
];

const OnboardingTour = () => {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const prefs = getPrefs();
    if (!prefs.onboarded) setOpen(true);
  }, [isAuthenticated]);

  const finish = () => {
    const prefs = getPrefs();
    savePrefs({ ...prefs, onboarded: true });
    setOpen(false);
  };

  const next = () => {
    if (step >= steps.length - 1) finish();
    else setStep((s) => s + 1);
  };

  const current = steps[step];
  const StepIcon = current.Icon;

  return (
    <Dialog
      open={open}
      onClose={finish}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { overflow: 'hidden' } }}
    >
      <Box sx={{ position: 'relative' }}>
        <IconButton onClick={finish} aria-label="Skip" sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, color: 'text.secondary' }}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>

        <Box
          sx={{
            px: 4,
            pt: 5,
            pb: 3,
            textAlign: 'center',
            backgroundImage: `radial-gradient(600px 200px at 50% -40%, ${alpha(theme.palette.primary.main, 0.18)}, transparent 70%)`,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 2,
              borderRadius: '18px',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              backgroundImage: `linear-gradient(150deg, ${theme.palette.primary.light}, ${theme.palette.primary.dark})`,
              boxShadow: `0 10px 24px -8px ${alpha(theme.palette.primary.main, 0.7)}`,
            }}
          >
            <StepIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 740, mb: 1 }}>{current.title}</Typography>
          <Typography color="text.secondary" sx={{ fontSize: '0.92rem', maxWidth: 360, mx: 'auto' }}>
            {current.body}
          </Typography>
        </Box>

        <MobileStepper
          variant="dots"
          steps={steps.length}
          position="static"
          activeStep={step}
          sx={{ bgcolor: 'transparent', px: 3, '& .MuiMobileStepper-dot': { mx: 0.4 }, '& .MuiMobileStepper-dotActive': { bgcolor: 'primary.main' } }}
          backButton={
            <Button size="small" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              Back
            </Button>
          }
          nextButton={
            <Button size="small" variant="contained" onClick={next}>
              {step >= steps.length - 1 ? 'Get started' : 'Next'}
            </Button>
          }
        />
        <Box sx={{ textAlign: 'center', pb: 2 }}>
          <Button size="small" onClick={finish} sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Skip intro
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default OnboardingTour;
