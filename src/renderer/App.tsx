import React, { useState, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import Settings from './components/Settings';
import Logs from './components/Logs';
import { Plug, AppConfig, LogEntry } from '../shared/types';

type TabType = 'control' | 'settings' | 'logs';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('control');
  const [isConnected, setIsConnected] = useState(false);
  const [plugs, setPlugs] = useState<Plug[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  useEffect(() => {
    // Apply dark mode class to body
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    // Save preference
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  useEffect(() => {
    // Load initial data
    loadConfig();
    loadLogs();
    loadSpeakerStatus();

    // Set up event listeners
    window.electronAPI.onConnectionStatus((connected) => {
      setIsConnected(connected);

      // Attempt to reconnect after a delay if disconnected
      if (!connected) {
        setTimeout(() => {
          window.electronAPI.reconnect().catch(() => {
            // Reconnection failed, will try again on next disconnect
          });
        }, 5000); // Wait 5 seconds before attempting reconnect
      }
    });

    window.electronAPI.onSpeakerStatus((status) => {
      setPlugs(status);
    });

    window.electronAPI.onNewLog((log) => {
      setLogs((prevLogs) => [...prevLogs, log]);
    });
  }, []);

  const loadConfig = async () => {
    const cfg = await window.electronAPI.getConfig();
    setConfig(cfg);
  };

  const loadLogs = async () => {
    const logEntries = await window.electronAPI.getLogs();
    setLogs(logEntries);
  };

  const loadSpeakerStatus = async () => {
    const status = await window.electronAPI.getSpeakerStatus();
    setPlugs(status);
  };

  const handleSaveConfig = async (newConfig: AppConfig) => {
    await window.electronAPI.setConfig(newConfig);
    setConfig(newConfig);
  };

  const handleStripChange = async (stripId: string) => {
    if (!config) return;
    const updatedConfig = { ...config, activeStripId: stripId };
    await handleSaveConfig(updatedConfig);
  };

  const handleClearLogs = async () => {
    await window.electronAPI.clearLogs();
    setLogs([]);
  };

  const handleReconnect = async () => {
    await window.electronAPI.reconnect();
  };

  return (
    <div className="app">
      <header className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Kasa Smart Plug Controller</h1>
            <div className="connection-status">
              <div className={`status-indicator ${isConnected ? '' : 'disconnected'}`} />
              <span>{isConnected ? 'Connected to Kasa Strip' : 'Disconnected'}</span>
              {!isConnected && (
                <button
                  onClick={handleReconnect}
                  style={{
                    marginLeft: '12px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Reconnect
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              padding: '8px 16px',
              fontSize: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'control' ? 'active' : ''}`}
          onClick={() => setActiveTab('control')}
        >
          Control Panel
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button
          className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Activity Logs
        </button>
      </div>

      <div className="main-content">
        <div className="tab-content">
          {activeTab === 'control' && (
            <ControlPanel plugs={plugs} config={config} onStripChange={handleStripChange} />
          )}
          {activeTab === 'settings' && config && (
            <Settings config={config} onSave={handleSaveConfig} />
          )}
          {activeTab === 'logs' && (
            <Logs logs={logs} onClear={handleClearLogs} />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
