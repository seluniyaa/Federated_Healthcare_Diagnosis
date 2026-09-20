import React, { useEffect, useRef } from 'react';
import { Terminal, CheckCircle2, RotateCw, Copy, Check } from 'lucide-react';

export const TrainingTerminal = ({
  logs = [],
  isRunning = false,
  title = "Node Worker Terminal",
  maxHeight = "280px",
  onClear = null
}) => {
  const scrollRef = useRef(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = () => {
    if (!logs.length) return;
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatLogLine = (line) => {
    // Detect tag patterns like [SGD], [INIT], [DP], [SIG], etc.
    const tagMatch = line.match(/\[([A-Z0-9_\-]+)\]/);
    const tag = tagMatch ? tagMatch[1] : null;

    let tagColor = 'var(--text-muted)';
    if (tag === 'INIT' || tag === 'BROADCAST') tagColor = '#38bdf8'; // cyan
    else if (tag === 'DATA' || tag?.startsWith('NODE')) tagColor = '#60a5fa'; // blue
    else if (tag === 'SGD' || tag === 'AGG') tagColor = '#c084fc'; // purple
    else if (tag === 'CLIP' || tag === 'DP') tagColor = '#fbbf24'; // amber
    else if (tag === 'CRYPTO' || tag === 'SIG') tagColor = '#34d399'; // emerald
    else if (tag === 'SUCCESS' || tag === 'DONE' || tag === 'CONSENSUS') tagColor = '#4ade80'; // bright green
    else if (tag === 'ERROR') tagColor = '#f87171'; // red

    return (
      <div key={line} style={{ display: 'flex', gap: '0.5rem', lineHeight: 1.55 }}>
        <span style={{ color: tagColor, fontWeight: 600 }}>{line}</span>
      </div>
    );
  };

  return (
    <div
      style={{
        background: '#030712',
        border: '1px solid #1e293b',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
        marginTop: '1rem'
      }}
    >
      {/* Terminal Title Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 0.85rem',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid #1e293b'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* OS Window Action Dots */}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.4rem' }}>
            <Terminal size={14} color="var(--primary-blue)" />
            <span className="mono" style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600 }}>
              {title}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {isRunning ? (
            <span className="mono" style={{ fontSize: '0.7rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <RotateCw size={12} className="pulse-node" />
              EXECUTING
            </span>
          ) : logs.length > 0 ? (
            <span className="mono" style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckCircle2 size={12} color="#10b981" />
              PROCESS IDLE
            </span>
          ) : null}

          {logs.length > 0 && (
            <button
              onClick={handleCopy}
              className="btn btn-secondary"
              style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', height: '22px' }}
              title="Copy terminal logs"
            >
              {copied ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}

          {onClear && logs.length > 0 && (
            <button
              onClick={onClear}
              className="btn btn-secondary"
              style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', height: '22px' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={scrollRef}
        className="mono"
        style={{
          padding: '0.85rem 1rem',
          maxHeight: maxHeight,
          overflowY: 'auto',
          fontSize: '0.78rem',
          color: '#cbd5e1',
          lineHeight: 1.6,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace"
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: '#475569', fontStyle: 'italic' }}>
            $ Ready. Awaiting training trigger command...
          </div>
        ) : (
          logs.map((line, idx) => (
            <React.Fragment key={idx}>{formatLogLine(line)}</React.Fragment>
          ))
        )}

        {isRunning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
            <span style={{ color: 'var(--primary-blue)' }}>$</span>
            <span className="pulse-node" style={{ display: 'inline-block', width: '8px', height: '14px', background: 'var(--emerald-accent)' }}></span>
          </div>
        )}
      </div>
    </div>
  );
};
