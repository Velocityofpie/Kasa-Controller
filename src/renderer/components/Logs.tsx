import React, { useRef, useEffect } from 'react';
import { LogEntry } from '../../shared/types';

interface LogsProps {
  logs: LogEntry[];
  onClear: () => void;
}

const Logs: React.FC<LogsProps> = ({ logs, onClear }) => {
  const logListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (logListRef.current) {
      logListRef.current.scrollTop = logListRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTimestamp = (timestamp: Date): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleClear = () => {
    const confirmed = confirm('Are you sure you want to clear all logs?');
    if (confirmed) {
      onClear();
    }
  };

  return (
    <div className="logs-container">
      <div className="logs-header">
        <h3>Activity Logs ({logs.length})</h3>
        <button className="btn-secondary" onClick={handleClear}>
          Clear Logs
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="empty-logs">
          <p>No logs yet. Activity will appear here.</p>
        </div>
      ) : (
        <div className="log-list" ref={logListRef}>
          {logs.map((log, index) => (
            <div key={index} className="log-entry">
              <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
              <span className={`log-level ${log.level}`}>{log.level}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Logs;
