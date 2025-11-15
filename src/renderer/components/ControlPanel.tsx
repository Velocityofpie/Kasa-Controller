import React, { memo } from 'react';
import { Plug, AppConfig } from '../../shared/types';

interface ControlPanelProps {
  plugs: Plug[];
  config: AppConfig | null;
  onStripChange: (stripId: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = memo(({ plugs, config, onStripChange }) => {
  const handleToggle = async (plugIndex: number, currentStatus: string) => {
    if (currentStatus === 'ON') {
      await window.electronAPI.turnOff(plugIndex);
    } else {
      await window.electronAPI.turnOn(plugIndex);
    }
  };

  const handleTurnOnAll = async () => {
    await window.electronAPI.turnOnAll();
  };

  const handleTurnOffAll = async () => {
    await window.electronAPI.turnOffAll();
  };

  const handleShutdown = async () => {
    const confirmed = confirm(
      'This will turn off all plugs and shut down your PC. Continue?'
    );
    if (confirmed) {
      await window.electronAPI.shutdownPC();
    }
  };

  const getPlugName = (index: number): string => {
    if (!config || !config.activeStripId || !config.strips) return `Plug ${index}`;
    const activeStrip = config.strips.find(s => s.id === config.activeStripId);
    if (!activeStrip) return `Plug ${index}`;
    const plug = activeStrip.plugs.find((p) => p.index === index);
    return plug?.name || `Plug ${index}`;
  };

  const activeStrip = config?.strips?.find(s => s.id === config.activeStripId);

  // Respect the plug order from settings instead of sorting by index
  const orderedPlugs = activeStrip?.plugs
    ? activeStrip.plugs
        .map(configPlug => plugs.find(p => p.index === configPlug.index))
        .filter((p): p is Plug => p !== undefined)
    : plugs.sort((a, b) => a.index - b.index);

  return (
    <div className="control-panel">
      {config && config.strips && config.strips.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Select Power Strip:
          </label>
          <select
            value={config.activeStripId || ''}
            onChange={(e) => onStripChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              fontFamily: 'Courier New, monospace',
              border: '3px solid var(--border-input)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              borderRadius: '0',
              boxShadow: '4px 4px 0 rgba(0, 0, 0, 0.2)',
            }}
          >
            {config.strips.map((strip) => (
              <option key={strip.id} value={strip.id}>
                {strip.name} ({strip.ipAddress})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="speakers-grid">
        {orderedPlugs.map((plug) => (
          <div key={plug.index} className="speaker-card">
            <h3>{getPlugName(plug.index)}</h3>
            <div className="speaker-status">
              <div
                className={`speaker-status-dot ${
                  plug.status === 'ON' ? 'on' : plug.status === 'OFF' ? 'off' : ''
                }`}
              />
              <span className={plug.status === 'ON' ? 'on' : 'off'}>
                {plug.status}
              </span>
            </div>
            <button
              className={plug.status === 'ON' ? 'btn-danger' : 'btn-success'}
              onClick={() => handleToggle(plug.index, plug.status)}
              disabled={plug.status === 'UNKNOWN'}
            >
              {plug.status === 'ON' ? 'Turn OFF' : 'Turn ON'}
            </button>
          </div>
        ))}
      </div>

      <div className="global-controls">
        <h3>Global Controls</h3>
        <div className="button-group">
          <button className="btn-success" onClick={handleTurnOnAll}>
            Turn All ON
          </button>
          <button className="btn-secondary" onClick={handleTurnOffAll}>
            Turn All OFF
          </button>
        </div>
        <button className="btn-danger shutdown-button" onClick={handleShutdown}>
          Turn Off All Plugs & Shutdown PC
        </button>
      </div>
    </div>
  );
});

ControlPanel.displayName = 'ControlPanel';

export default ControlPanel;
