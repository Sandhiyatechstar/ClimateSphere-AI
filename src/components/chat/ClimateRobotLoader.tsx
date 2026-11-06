import React, { useState, useEffect } from 'react';

/**
 * Rotating climate-themed messages shown while the AI is thinking.
 */
const CLIMATE_MESSAGES = [
  "Checking Earth's pulse...",
  'Gathering some weather wisdom...',
  'Growing a greener answer for you...',
  'Reading the clouds, one moment...',
  "Exploring Earth's temperature story...",
  'Connecting the climate clues...',
  'Making sense of our changing planet...',
  'Almost there! Your climate insight is growing...',
];

const MESSAGE_INTERVAL_MS = 3200;

/**
 * A friendly animated climate robot that appears while ClimateSphere AI
 * is processing a response. Includes a rotating set of climate-related
 * messages beneath it.
 *
 * This component renders ONLY during the thinking/loading state.
 */
export const ClimateRobotLoader: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % CLIMATE_MESSAGES.length);
    }, MESSAGE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="flex items-start gap-3.5 animate-in fade-in duration-300"
      role="status"
      aria-live="polite"
      aria-label="ClimateSphere AI is processing your request"
    >
      {/* Robot Avatar */}
      <div className="climate-robot-float shrink-0">
        <svg
          width="44"
          height="44"
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="drop-shadow-lg"
        >
          {/* Antenna */}
          <line x1="22" y1="4" x2="22" y2="10" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
          <circle cx="22" cy="3" r="2.5" fill="#22d3ee" className="climate-robot-blink" />

          {/* Head */}
          <rect x="8" y="10" width="28" height="18" rx="6" fill="url(#robotHeadGrad)" stroke="#22d3ee" strokeWidth="1.2" />

          {/* Left Eye */}
          <circle cx="16" cy="20" r="3" fill="#0f172a" />
          <circle cx="16" cy="19.5" r="1.5" fill="#22d3ee" className="climate-robot-blink" />

          {/* Right Eye */}
          <circle cx="28" cy="20" r="3" fill="#0f172a" />
          <circle cx="28" cy="19.5" r="1.5" fill="#22d3ee" className="climate-robot-blink" />

          {/* Smile */}
          <path d="M17 24 Q22 27.5 27 24" stroke="#22d3ee" strokeWidth="1.3" strokeLinecap="round" fill="none" />

          {/* Earth emblem on forehead */}
          <circle cx="22" cy="14.5" r="2.2" fill="#14b8a6" opacity="0.8" />
          <path d="M20.5 14.5 Q22 13 23.5 14.5 Q22 16 20.5 14.5Z" fill="#0ea5e9" opacity="0.7" />

          {/* Body */}
          <rect x="12" y="29" width="20" height="10" rx="4" fill="url(#robotBodyGrad)" stroke="#22d3ee" strokeWidth="1" />

          {/* Body detail line */}
          <line x1="17" y1="33" x2="27" y2="33" stroke="#22d3ee" strokeWidth="0.8" opacity="0.5" />
          <line x1="17" y1="35.5" x2="27" y2="35.5" stroke="#22d3ee" strokeWidth="0.8" opacity="0.3" />

          {/* Left arm */}
          <rect x="4" y="30" width="7" height="3.5" rx="1.7" fill="#0ea5e9" opacity="0.7" className="climate-robot-wave" />

          {/* Right arm */}
          <rect x="33" y="30" width="7" height="3.5" rx="1.7" fill="#0ea5e9" opacity="0.7" />

          {/* Gradients */}
          <defs>
            <linearGradient id="robotHeadGrad" x1="8" y1="10" x2="36" y2="28">
              <stop offset="0%" stopColor="#0c4a6e" />
              <stop offset="100%" stopColor="#164e63" />
            </linearGradient>
            <linearGradient id="robotBodyGrad" x1="12" y1="29" x2="32" y2="39">
              <stop offset="0%" stopColor="#0e7490" />
              <stop offset="100%" stopColor="#115e59" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Message Area */}
      <div className="flex-1 min-w-0 p-4 rounded-2xl rounded-tl-xs glass-card border border-cyan-500/30 shadow-floating">
        {/* Heading */}
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-bold text-cyan-300 font-mono tracking-wide">
            Your Climate Buddy is thinking!
          </span>
        </div>

        {/* Rotating Message */}
        <p
          key={messageIndex}
          className="text-xs sm:text-sm text-slate-300 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-500"
        >
          {CLIMATE_MESSAGES[messageIndex]}
        </p>
      </div>
    </div>
  );
};
