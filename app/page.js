"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { ArrowUpward, Build, PushPin } from '@mui/icons-material';
import { motion } from 'framer-motion';
import WelcomeScreen from './WelcomeScreen';
import Logo from './Logo';
import ChatMarkdown from './ChatMarkdown';
import PinnedPanel from './PinnedPanel';
import { usePinned } from './pinned';



export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm the ProfSpot assistant for Cal State Fullerton. Ask me about CSUF professors, courses, or teaching styles!",
    },
  ]);

  const [message, setMessage] = useState('');
  const endRef = useRef(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const { pinned } = usePinned();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    const fail = (kind) =>
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          kind,
          content:
            kind === 'maintenance'
              ? "ProfSpot is currently under maintenance. We'll be back soon, please check back later!"
              : 'Sorry, something went wrong on my end. Please try again in a moment.',
        },
      ]);

    let response;
    try {
      response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([...messages, { role: 'user', content: message }].map(({ role, content }) => ({ role, content }))),
      });
    } catch {
      return fail('error');
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return fail(body.error === 'maintenance' ? 'maintenance' : 'error');
    }

    let professors = [];
    try {
      professors = JSON.parse(decodeURIComponent(response.headers.get('X-Professors') || '[]'));
    } catch {}
    setMessages((prev) => [...prev.slice(0, -1), { ...prev[prev.length - 1], professors }]);

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
      <PinnedPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
      {showWelcome && <WelcomeScreen onFinish={() => setShowWelcome(false)} />}
      <Box
        sx={{
          display: contentVisible ? 'flex' : 'none',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          height: '100vh',
          p: { xs: 1.5, sm: 3 },
          gap: 2,
          overflow: 'hidden',
        }}
      >
        <Box
          className="clay"
          sx={{
            width: '100%',
            maxWidth: 720,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1.25,
            borderRadius: '999px',
          }}
        >
          <Logo size={48} />
          <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--csuf-blue)' }}>
            ProfSpot <span style={{ color: 'var(--csuf-orange)' }}>CSUF</span>
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <button
            className="clay-btn"
            onClick={() => setPanelOpen(true)}
            aria-label={`Saved professors (${pinned.length})`}
            title="Saved professors"
            style={{
              position: 'relative', width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center',
              color: 'var(--csuf-blue)', background: 'var(--clay-surface)',
            }}
          >
            <PushPin />
            {pinned.length > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, padding: '0 5px',
                background: 'var(--csuf-orange)', color: '#fff', fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center',
              }}>{pinned.length}</span>
            )}
          </button>
          <a
            href="https://github.com/ricozama121803/profspot-csuf"
            target="_blank"
            rel="noreferrer"
            aria-label="View source on GitHub"
            className="clay-btn"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--csuf-blue)',
              background: 'var(--clay-surface)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="22" height="22" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82a7.68 7.68 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </Box>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: contentVisible ? 1 : 0, y: contentVisible ? 0 : 12 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          style={{ width: '100%', maxWidth: 720, flex: 1, minHeight: 0 }}
        >
          <Stack className="clay" sx={{ height: '100%', p: { xs: 1.5, sm: 2.5 }, borderRadius: '36px', gap: 2 }}>
            <Stack className="clay-scroll" spacing={2} sx={{ flexGrow: 1, overflowY: 'auto', p: 0.5, pr: 1 }}>
              {messages.map((m, index) => {
                const isAssistant = m.role === 'assistant';
                return (
                  <Box key={index} display="flex" justifyContent={isAssistant ? 'flex-start' : 'flex-end'}>
                    <Box
                      className={isAssistant ? 'clay' : 'clay-btn'}
                      sx={{
                        background: isAssistant ? '#fff' : 'var(--csuf-orange)',
                        color: isAssistant ? 'var(--clay-ink)' : '#fff',
                        borderRadius: isAssistant ? '24px 24px 24px 8px' : '24px 24px 8px 24px',
                        px: 2.5,
                        py: 1.75,
                        maxWidth: '85%',
                        lineHeight: 1.5,
                        cursor: 'default',
                      }}
                    >
                      {m.kind === 'maintenance' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <span
                            className="clay-inset"
                            style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'var(--csuf-orange)' }}
                          >
                            <Build style={{ fontSize: 20 }} />
                          </span>
                          <span>
                            <strong style={{ color: 'var(--csuf-blue)' }}>Under maintenance</strong>
                            <br />
                            {m.content}
                          </span>
                        </Box>
                      ) : (
                        <div className="md">
                          <ChatMarkdown content={m.content} professors={m.professors} />
                        </div>
                      )}
                    </Box>
                  </Box>
                );
              })}
              <div ref={endRef} />
            </Stack>

            <Box className="clay-inset" sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, borderRadius: '999px' }}>
              <input
                className="clay-input"
                placeholder="Ask about a CSUF professor or course…"
                aria-label="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                className="clay-btn"
                onClick={sendMessage}
                aria-label="Send message"
                style={{
                  width: 48,
                  height: 48,
                  flexShrink: 0,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--csuf-orange)',
                  color: '#fff',
                }}
              >
                <ArrowUpward />
              </button>
            </Box>
          </Stack>
        </motion.div>
      </Box>
    </Box>
  );
}
