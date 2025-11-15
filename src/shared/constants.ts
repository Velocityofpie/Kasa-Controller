export const DEFAULT_CONFIG = {
  strips: [
    {
      id: 'default-strip',
      name: 'Main Power Strip',
      ipAddress: '',  // User must configure
      plugs: [
        { index: 0, name: 'Plug 0' },
        { index: 1, name: 'Plug 1' },
        { index: 2, name: 'Plug 2' },
        { index: 3, name: 'Plug 3' },
        { index: 4, name: 'Plug 4' },
        { index: 5, name: 'Plug 5' },
      ],
    },
  ],
  activeStripId: 'default-strip',
  autoStartEnabled: false,
  autoOnAtLaunch: false,
  autoOffOnShutdown: false,
  logRetentionDays: 30,
};

export const STATUS_POLL_INTERVAL = 10000; // 10 seconds (reduced CPU usage)
export const CONNECTION_TIMEOUT = 10000; // 10 seconds
export const SHUTDOWN_GRACE_PERIOD = 3000; // 3 seconds to turn off speakers before shutdown
