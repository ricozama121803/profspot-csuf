"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { ArrowUpward, Star, LocalFireDepartment, ThumbUp, School, MenuBook, Notes, Build } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import WelcomeScreen from './WelcomeScreen';
import Logo from './Logo';



// Turns "- **Overall Rating:** 4.4/5 (44 ratings)" list items into icon rows with color-coded values.
const textOf = (node) =>
  typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join('')
      : node?.props?.children !== undefined
        ? textOf(node.props.children)
        : '';

const GOOD = '#1e9e5a', OK = '#e0a000', BAD = '#d9452f';
// higher is better unless `invert` (difficulty)
const tone = (value, min, max, invert) => {
  const r = (invert ? max - value : value - min) / (max - min);
  return r >= 0.7 ? GOOD : r >= 0.5 ? OK : BAD;
};

const STATS = [
  { re: /^overall( rating)?/i, label: 'Overall Rating', Icon: Star, color: (t) => tone(parseFloat(t), 1, 5) },
  { re: /^difficulty/i, label: 'Difficulty', Icon: LocalFireDepartment, color: (t) => tone(parseFloat(t), 1, 5, true) },
  { re: /^would take again/i, label: 'Would Take Again', Icon: ThumbUp, color: (t) => tone(parseFloat(t), 0, 100) },
  { re: /^department/i, label: 'Department', Icon: School, color: () => 'var(--csuf-blue)' },
  { re: /^courses?/i, label: 'Courses', Icon: MenuBook, color: () => 'var(--csuf-blue)' },
  { re: /^summary/i, label: 'Summary', Icon: Notes, color: () => 'var(--csuf-blue)' },
];

function StatItem({ children, node, ...rest }) {
  const match = textOf(children).trim().match(/^([A-Za-z ]+?)\s*:\s*([\s\S]*)$/);
  const stat = match && STATS.find((s) => s.re.test(match[1].trim()));
  if (!stat) return <li {...rest}>{children}</li>;
  const { Icon, label } = stat;
  const value = match[2].trim();
  const color = stat.color(value);
  const numeric = ['Overall Rating', 'Difficulty', 'Would Take Again'].includes(label);
  return (
    <li style={{ listStyle: 'none', margin: '6px 0 0 -1.25rem', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span
        className="clay-inset"
        style={{ width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, color }}
        title={label}
      >
        <Icon style={{ fontSize: 18 }} />
      </span>
      <span style={{ paddingTop: 4 }}>
        <span style={{ color: 'var(--clay-ink-soft)', fontSize: '0.8rem', fontWeight: 700, marginRight: 6 }}>{label}</span>
        <span style={numeric ? { fontWeight: 800, color } : undefined}>{value}</span>
      </span>
    </li>
  );
}

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
        body: JSON.stringify([...messages, { role: 'user', content: message }]),
      });
    } catch {
      return fail('error');
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return fail(body.error === 'maintenance' ? 'maintenance' : 'error');
    }

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
                          <ReactMarkdown components={{ li: StatItem }}>{m.content || '…'}</ReactMarkdown>
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
