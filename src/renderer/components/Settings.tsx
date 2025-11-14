import React, { useState } from 'react';
import { AppConfig, SmartStrip } from '../../shared/types';

interface SettingsProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
}

const Settings: React.FC<SettingsProps> = ({ config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [selectedStripId, setSelectedStripId] = useState<string | null>(
    localConfig.strips && localConfig.strips.length > 0 ? localConfig.strips[0].id : null
  );

  const handleSave = () => {
    onSave(localConfig);
    alert('Settings saved successfully!');
  };

  // Strip management
  const handleAddStrip = () => {
    const newId = `strip-${Date.now()}`;
    const newStrip: SmartStrip = {
      id: newId,
      name: 'New Power Strip',
      ipAddress: '192.168.1.100',
      plugs: [
        { index: 0, name: 'Plug 0' },
        { index: 1, name: 'Plug 1' },
      ],
    };
    setLocalConfig({
      ...localConfig,
      strips: [...(localConfig.strips || []), newStrip],
      activeStripId: localConfig.activeStripId || newId,
    });
    setSelectedStripId(newId);
  };

  const handleRemoveStrip = (stripId: string) => {
    const confirmed = confirm('Are you sure you want to remove this power strip?');
    if (!confirmed) return;

    const updatedStrips = (localConfig.strips || []).filter((s) => s.id !== stripId);
    const newActiveId = updatedStrips.length > 0 ? updatedStrips[0].id : null;

    setLocalConfig({
      ...localConfig,
      strips: updatedStrips,
      activeStripId: localConfig.activeStripId === stripId ? newActiveId : localConfig.activeStripId,
    });

    if (selectedStripId === stripId) {
      setSelectedStripId(newActiveId);
    }
  };

  const handleStripNameChange = (stripId: string, name: string) => {
    setLocalConfig({
      ...localConfig,
      strips: (localConfig.strips || []).map((s) =>
        s.id === stripId ? { ...s, name } : s
      ),
    });
  };

  const handleStripIpChange = (stripId: string, ipAddress: string) => {
    setLocalConfig({
      ...localConfig,
      strips: (localConfig.strips || []).map((s) =>
        s.id === stripId ? { ...s, ipAddress } : s
      ),
    });
  };

  // Plug management
  const handleAddPlug = (stripId: string) => {
    const strip = (localConfig.strips || []).find((s) => s.id === stripId);
    if (!strip) return;

    const newIndex = strip.plugs.length > 0
      ? Math.max(...strip.plugs.map((p) => p.index)) + 1
      : 0;

    setLocalConfig({
      ...localConfig,
      strips: (localConfig.strips || []).map((s) =>
        s.id === stripId
          ? { ...s, plugs: [...s.plugs, { index: newIndex, name: `Plug ${newIndex}` }] }
          : s
      ),
    });
  };

  const handleRemovePlug = (stripId: string, plugIndex: number) => {
    setLocalConfig({
      ...localConfig,
      strips: (localConfig.strips || []).map((s) =>
        s.id === stripId
          ? { ...s, plugs: s.plugs.filter((p) => p.index !== plugIndex) }
          : s
      ),
    });
  };

  const handlePlugNameChange = (stripId: string, plugIndex: number, name: string) => {
    setLocalConfig({
      ...localConfig,
      strips: (localConfig.strips || []).map((s) =>
        s.id === stripId
          ? {
              ...s,
              plugs: s.plugs.map((p) =>
                p.index === plugIndex ? { ...p, name } : p
              ),
            }
          : s
      ),
    });
  };

  const handlePlugIndexChange = (stripId: string, oldIndex: number, newIndex: number) => {
    setLocalConfig({
      ...localConfig,
      strips: (localConfig.strips || []).map((s) =>
        s.id === stripId
          ? {
              ...s,
              plugs: s.plugs.map((p) =>
                p.index === oldIndex ? { ...p, index: newIndex } : p
              ),
            }
          : s
      ),
    });
  };

  const movePlugUp = (stripId: string, plugArrayIndex: number) => {
    if (plugArrayIndex === 0) return;

    setLocalConfig({
      ...localConfig,
      strips: (localConfig.strips || []).map((s) => {
        if (s.id !== stripId) return s;

        const newPlugs = [...s.plugs];
        [newPlugs[plugArrayIndex - 1], newPlugs[plugArrayIndex]] =
        [newPlugs[plugArrayIndex], newPlugs[plugArrayIndex - 1]];

        return { ...s, plugs: newPlugs };
      }),
    });
  };

  const movePlugDown = (stripId: string, plugArrayIndex: number) => {
    const strip = (localConfig.strips || []).find((s) => s.id === stripId);
    if (!strip || plugArrayIndex >= strip.plugs.length - 1) return;

    setLocalConfig({
      ...localConfig,
      strips: (localConfig.strips || []).map((s) => {
        if (s.id !== stripId) return s;

        const newPlugs = [...s.plugs];
        [newPlugs[plugArrayIndex], newPlugs[plugArrayIndex + 1]] =
        [newPlugs[plugArrayIndex + 1], newPlugs[plugArrayIndex]];

        return { ...s, plugs: newPlugs };
      }),
    });
  };

  const handleAutoStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalConfig({ ...localConfig, autoStartEnabled: e.target.checked });
  };

  const handleAutoOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalConfig({ ...localConfig, autoOnAtLaunch: e.target.checked });
  };

  const handleLogRetentionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalConfig({ ...localConfig, logRetentionDays: parseInt(e.target.value, 10) });
  };

  const selectedStrip = (localConfig.strips || []).find((s) => s.id === selectedStripId);

  return (
    <div>
      <div className="settings-section">
        <h3>Power Strips</h3>
        <p style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Manage your Kasa power strips. Add multiple strips and configure which plugs to control on each.
        </p>

        {localConfig.strips && localConfig.strips.length > 0 && (
          <div className="form-group">
            <label>Select Strip to Configure:</label>
            <select
              value={selectedStripId || ''}
              onChange={(e) => setSelectedStripId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                fontFamily: 'Courier New, monospace',
                border: '3px solid var(--border-input)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                borderRadius: '0',
                boxShadow: '4px 4px 0 rgba(0, 0, 0, 0.2)',
                marginBottom: '16px',
              }}
            >
              {(localConfig.strips || []).map((strip) => (
                <option key={strip.id} value={strip.id}>
                  {strip.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedStrip && (
          <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-tertiary)', border: '2px solid var(--border-color)' }}>
            <div className="form-group">
              <label>Strip Name</label>
              <input
                type="text"
                value={selectedStrip.name}
                onChange={(e) => handleStripNameChange(selectedStrip.id, e.target.value)}
                placeholder="My Power Strip"
              />
            </div>
            <div className="form-group">
              <label>IP Address</label>
              <input
                type="text"
                value={selectedStrip.ipAddress}
                onChange={(e) => handleStripIpChange(selectedStrip.id, e.target.value)}
                placeholder="192.168.1.100"
              />
            </div>
            <button
              className="btn-danger"
              onClick={() => handleRemoveStrip(selectedStrip.id)}
              disabled={localConfig.strips.length === 1}
              style={{ marginTop: '8px' }}
            >
              Remove This Strip
            </button>
          </div>
        )}

        <button className="btn-success" onClick={handleAddStrip}>
          Add New Power Strip
        </button>
      </div>

      {selectedStrip && (
        <div className="settings-section">
          <h3>Plugs for "{selectedStrip.name}"</h3>
          <p style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Configure which plugs on this power strip to control. Use ↑↓ buttons to reorder how they appear on the dashboard.
          </p>
          {selectedStrip.plugs.map((plug, arrayIndex) => (
            <div key={plug.index} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  onClick={() => movePlugUp(selectedStrip.id, arrayIndex)}
                  disabled={arrayIndex === 0}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    background: arrayIndex === 0 ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    color: arrayIndex === 0 ? 'var(--text-secondary)' : 'var(--text-primary)',
                    border: '2px solid var(--border-color)',
                    cursor: arrayIndex === 0 ? 'not-allowed' : 'pointer',
                    height: '20px',
                  }}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => movePlugDown(selectedStrip.id, arrayIndex)}
                  disabled={arrayIndex >= selectedStrip.plugs.length - 1}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    background: arrayIndex >= selectedStrip.plugs.length - 1 ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    color: arrayIndex >= selectedStrip.plugs.length - 1 ? 'var(--text-secondary)' : 'var(--text-primary)',
                    border: '2px solid var(--border-color)',
                    cursor: arrayIndex >= selectedStrip.plugs.length - 1 ? 'not-allowed' : 'pointer',
                    height: '20px',
                  }}
                  title="Move down"
                >
                  ↓
                </button>
              </div>
              <div className="form-group" style={{ flex: '0 0 120px', marginBottom: 0 }}>
                <label>Plug Index</label>
                <input
                  type="number"
                  value={plug.index}
                  onChange={(e) => handlePlugIndexChange(selectedStrip.id, plug.index, parseInt(e.target.value, 10))}
                  min="0"
                  max="10"
                  placeholder="0"
                />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Name</label>
                <input
                  type="text"
                  value={plug.name}
                  onChange={(e) => handlePlugNameChange(selectedStrip.id, plug.index, e.target.value)}
                  placeholder={`Plug ${plug.index}`}
                />
              </div>
              <button
                className="btn-danger"
                onClick={() => handleRemovePlug(selectedStrip.id, plug.index)}
                style={{ height: '46px', width: 'auto', padding: '0 20px' }}
              >
                Remove
              </button>
            </div>
          ))}
          <button className="btn-success" onClick={() => handleAddPlug(selectedStrip.id)} style={{ marginTop: '12px' }}>
            Add Plug
          </button>
        </div>
      )}

      <div className="settings-section">
        <h3>Startup Options</h3>
        <div className="form-group">
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="autoStart"
              checked={localConfig.autoStartEnabled}
              onChange={handleAutoStartChange}
            />
            <label htmlFor="autoStart">Launch app on Windows startup</label>
          </div>
        </div>
        <div className="form-group">
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="autoOn"
              checked={localConfig.autoOnAtLaunch}
              onChange={handleAutoOnChange}
            />
            <label htmlFor="autoOn">Turn on plugs when app launches</label>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Logging</h3>
        <div className="form-group">
          <label>Log Retention (days)</label>
          <input
            type="number"
            value={localConfig.logRetentionDays}
            onChange={handleLogRetentionChange}
            min="1"
            max="365"
          />
        </div>
      </div>

      <div className="settings-section">
        <button className="btn-primary" onClick={handleSave}>
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;
