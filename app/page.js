"use client";
import React, { useState, useEffect } from 'react';
import { Box, Stack, TextField, Button, Typography, InputAdornment } from '@mui/material';
import { ArrowUpward } from '@mui/icons-material'; 
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import WelcomeScreen from './WelcomeScreen';
import Head from 'next/head'; // Import this if using Next.js


export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm the Rate My Professor support assistant. How can I help you today?",
    },
  ]);

  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!showWelcome) {
      const timer = setTimeout(() => {
        setContentVisible(true);
      }, 1000); // Slight delay to sync with WelcomeScreen
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  const sendMessage = async () => {
    if (message.trim() === '') return; // Prevent sending empty messages

    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ]);

    setMessage('');

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([...messages, { role: 'user', content: message }]),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let result = '';
    const processText = async ({ done, value }) => {
      if (done) {
        return result;
      }
      const text = decoder.decode(value || new Uint8Array(), { stream: true });
      setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        const otherMessages = prevMessages.slice(0, prevMessages.length - 1);
        return [
          ...otherMessages,
          { ...lastMessage, content: lastMessage.content + text },
        ];
      });

      return reader.read().then(processText);
    };

    reader.read().then(processText);
  };

  return (
    <Box>
      <Head>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      </Head>
      {showWelcome && <WelcomeScreen onFinish={() => setShowWelcome(false)} />}
      <Box
        sx={{
          display: contentVisible ? 'block' : 'none',
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundImage: `url('/abstract3.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          overflow: 'hidden',
        }}
      >
        {/* Header with logo and app */}
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            padding: '16px',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          <img
            src="/logo-small.png" 
            alt="ProfSpot Logo"
            style={{ width: '90px', height: '50px', marginRight: '-17px' }}
          />
          <Typography variant="h6" fontWeight="bold" color='#a3aab5'
            sx={{
              fontFamily: "Arial, sans-serif",
              fontSize: "1.5rem",
            }}
          >
            ProfSpot
          </Typography>
        </Box>

        <Box
          sx={{
            display: contentVisible ? 'block' : 'none',
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2, ease: [0.4, 0, 0.2, 1] }}  // Custom easing for smoother effect
          >
            <Stack
              direction="column"
              width="500px"
              height="700px"
              p={2}
              spacing={3}
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Stack
                direction="column"
                spacing={2}
                flexGrow={1}
                overflow={'auto'}
                sx={{
                  maxHeight: '100%',
                  padding: '10px',
                  '&::-webkit-scrollbar': {
                    width: '5px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#888',
                    borderRadius: '10px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    backgroundColor: '#555',
                  },
                }}
              >
                {messages.map((message, index) => (
                  <Box
                    key={index}
                    display="flex"
                    justifyContent={
                      message.role === 'assistant' ? 'flex-start' : 'flex-end'
                    }
                  >
                    <Box
                      sx={{
                        bgcolor:
                          message.role === 'assistant'
                            ? 'rgba(0, 0, 0, 0.5)'
                            : 'rgba(10, 130, 180, 0.7)',
                        backdropFilter: 'blur(5px)',
                        color: 'white',
                        borderRadius: '16px',
                        p: 3,
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        maxWidth: '80%',
                      }}
                    >
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </Box>
                  </Box>
                ))}
              </Stack>
              <Stack direction={'row'} spacing={2}>
                <TextField
                  label="Message"
                  fullWidth
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(5px)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          onClick={sendMessage}
                          sx={{
                            minWidth: 'auto',
                            borderRadius: '50%',
                            padding: '4px',
                            bgcolor: 'rgba(255, 255, 255, 0.3)',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.4)',
                            },
                          }}
                        >
                          <ArrowUpward />
                        </Button>
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>
            </Stack>
          </motion.div>
        </Box>
        {contentVisible && (
    <Box
      component="a"
      href="https://github.com/ricozama121803/HEADSTARTERTEAM-AiRateMyProfessor"
      target="_blank"
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        cursor: 'pointer',
        color: '#a3aab5',
        '&:hover': {
          color: '#555',
        },
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width="50"
        height="50"
        fill="currentColor"
      >
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82a7.68 7.68 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
      </svg>
    </Box>
  )}
</Box>
    </Box>
  );
}
