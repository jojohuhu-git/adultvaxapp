import { useState } from 'react';

export default function StatusItem({ item }) {
  const [expanded, setExpanded] = useState(false);
  const chips = item.chips || [];
  const refs = item.refs || [];

  return (
    <div className={`status-item ${item.type}`}>
      <div className="status-icon">{item.icon}</div>
      <div className="status-main">
        <div className="status-title">{item.title}</div>
        {chips.length > 0 && (
          <div className="status-chips">
            {chips.map((c, i) => (
              <span key={i} className={`status-chip chip-${c.type || 'brand'}`}>{c.text}</span>
            ))}
          </div>
        )}
        {item.detail && (
          <>
            <button
              className="status-expand-btn"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '\u25b2 less' : '\u25bc details'}
            </button>
            <div className={`status-detail-text${expanded ? ' open' : ''}`}
              dangerouslySetInnerHTML={{ __html: item.detail }}
            />
          </>
        )}
      </div>
      {refs.length > 0 && (
        <div className="status-refs-wrap">
          {refs.map((r, i) => (
            <a
              key={i}
              className="status-ref"
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              title={r.tip}
            >
              {r.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
