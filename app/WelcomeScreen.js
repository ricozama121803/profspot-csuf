import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import Logo from './Logo';

export default function WelcomeScreen({ onFinish }) {
  const [fadeOut, setFadeOut] = useState(false);

  const handleClick = () => {
    setFadeOut(true);
    setTimeout(onFinish, 800); // wait for the fade-out animation
  };

  return (
    <motion.div
      initial={{ opacity: 1, scale: 1 }}
      animate={{ opacity: fadeOut ? 0 : 1, scale: fadeOut ? 0.95 : 1 }}
      transition={{ duration: 0.8 }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(160deg, #eaf2fc, #d9e7f7)',
          p: 2,
        }}
      >
        <Box
          className="clay"
          sx={{
            width: '100%',
            maxWidth: 420,
            borderRadius: '40px',
            p: { xs: 4, sm: 5 },
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2.5,
          }}
        >
          <motion.div initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }}>
            <Logo size={120} />
          </motion.div>
          <Typography sx={{ color: 'var(--clay-ink-soft)', fontWeight: 700, fontSize: '0.9rem', letterSpacing: 1 }}>
            INTRODUCING
          </Typography>
          <Typography variant="h3" sx={{ color: 'var(--csuf-blue)', fontWeight: 800, lineHeight: 1.1 }}>
            ProfSpot <span style={{ color: 'var(--csuf-orange)' }}>CSUF</span>
          </Typography>
          <Typography sx={{ color: 'var(--clay-ink-soft)', fontSize: '1.05rem' }}>
            AI professor search for Cal State Fullerton Titans
          </Typography>
          <button
            className="clay-btn"
            onClick={handleClick}
            style={{
              marginTop: 12,
              padding: '14px 36px',
              borderRadius: 999,
              background: 'var(--csuf-orange)',
              color: '#fff',
              fontSize: '1.05rem',
              fontWeight: 700,
            }}
          >
            Chat now
          </button>
        </Box>
      </Box>
    </motion.div>
  );
}
