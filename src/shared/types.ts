export interface Plug {
  index: number;
  name: string;
  status: 'ON' | 'OFF' | 'UNKNOWN';
}

export interface SmartStrip {
  id: string;
  name: string;
  ipAddress: string;
  plugs: {
    index: number;
    name: string;
  }[];
}

export interface AppConfig {
  strips: SmartStrip[];
  activeStripId: string | null;
  autoStartEnabled: boolean;
  autoOnAtLaunch: boolean;
  autoOffOnShutdown: boolean;
  logRetentionDays: number;
}

// Legacy type alias for backwards compatibility
export type SpeakerPlug = Plug;

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface SystemTrayMenuItem {
  label: string;
  click?: () => void;
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
}
