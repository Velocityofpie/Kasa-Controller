import { Client, Plug } from 'tplink-smarthome-api';
import { EventEmitter } from 'events';
import { SpeakerPlug } from '../shared/types';
import { CONNECTION_TIMEOUT, STATUS_POLL_INTERVAL } from '../shared/constants';

export class KasaManager extends EventEmitter {
  private client: Client;
  private strip: Plug | null = null;
  private ipAddress: string;
  private plugIndexes: number[];
  private statusPollInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;

  constructor(ipAddress: string, plugIndexes: number[]) {
    super();
    this.client = new Client();
    this.ipAddress = ipAddress;
    this.plugIndexes = plugIndexes;
  }

  async connect(): Promise<boolean> {
    try {
      this.log('info', `Attempting to connect to Kasa strip at ${this.ipAddress}...`);

      this.strip = await this.client.getDevice(
        { host: this.ipAddress },
        { timeout: CONNECTION_TIMEOUT }
      ) as Plug;

      if (!this.strip) {
        throw new Error('Failed to get device');
      }

      this.isConnected = true;
      this.log('info', 'Successfully connected to Kasa strip');
      this.emit('connected');

      // Start status polling
      this.startStatusPolling();

      return true;
    } catch (error) {
      this.isConnected = false;
      this.log('error', `Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('error', error);
      return false;
    }
  }

  async getStatus(): Promise<SpeakerPlug[]> {
    if (!this.strip || !this.isConnected) {
      this.log('warn', 'Cannot get status - not connected to strip');
      return this.plugIndexes.map(index => ({
        index,
        name: `Plug ${index}`,
        status: 'UNKNOWN' as const,
      }));
    }

    try {
      // Get the strip's system info which includes all child states
      const sysInfo = await this.strip.getSysInfo();
      const speakers: SpeakerPlug[] = [];

      for (const index of this.plugIndexes) {
        const childInfo = sysInfo.children?.[index];
        if (childInfo) {
          speakers.push({
            index,
            name: childInfo.alias || `Plug ${index}`,
            status: childInfo.state === 1 ? 'ON' : 'OFF',
          });
        } else {
          speakers.push({
            index,
            name: `Plug ${index}`,
            status: 'UNKNOWN',
          });
        }
      }

      return speakers;
    } catch (error) {
      // Check if it's a connection error
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('ECONNRESET') || errorMsg.includes('ETIMEDOUT') || errorMsg.includes('EHOSTUNREACH')) {
        this.log('error', `Connection lost: ${errorMsg}`);
        this.handleConnectionLost();
      } else {
        this.log('error', `Failed to get status: ${errorMsg}`);
      }
      this.emit('error', error);
      return this.plugIndexes.map(index => ({
        index,
        name: `Plug ${index}`,
        status: 'UNKNOWN' as const,
      }));
    }
  }

  private handleConnectionLost(): void {
    if (this.isConnected) {
      this.isConnected = false;
      this.stopStatusPolling();
      this.emit('disconnected');
    }
  }

  async turnOn(plugIndex: number): Promise<boolean> {
    if (!this.strip || !this.isConnected) {
      this.log('error', 'Cannot turn on - not connected to strip');
      return false;
    }

    try {
      // Get child ID for the plug
      const childId = await this.getChildId(plugIndex);

      // Send command directly to the device to turn on specific plug
      const payload = {
        context: {
          child_ids: [childId]
        },
        system: {
          set_relay_state: { state: 1 }
        }
      };

      await this.client.send(payload, this.ipAddress);

      // Get child name for logging
      const sysInfo = await this.strip.getSysInfo();
      const childName = sysInfo.children?.[plugIndex]?.alias || `Plug ${plugIndex}`;

      this.log('info', `Turned ON plug ${plugIndex} (${childName})`);
      this.emit('plugStateChanged', plugIndex, 'ON');
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('ECONNRESET') || errorMsg.includes('ETIMEDOUT') || errorMsg.includes('EHOSTUNREACH')) {
        this.log('error', `Connection lost while turning on plug ${plugIndex}: ${errorMsg}`);
        this.handleConnectionLost();
      } else {
        this.log('error', `Failed to turn on plug ${plugIndex}: ${errorMsg}`);
      }
      this.emit('error', error);
      return false;
    }
  }

  private async getChildId(plugIndex: number): Promise<string> {
    const sysInfo = await this.strip!.getSysInfo();
    return sysInfo.children?.[plugIndex]?.id || '';
  }

  async turnOff(plugIndex: number): Promise<boolean> {
    if (!this.strip || !this.isConnected) {
      this.log('error', 'Cannot turn off - not connected to strip');
      return false;
    }

    try {
      // Get child ID for the plug
      const childId = await this.getChildId(plugIndex);

      // Send command directly to the device to turn off specific plug
      const payload = {
        context: {
          child_ids: [childId]
        },
        system: {
          set_relay_state: { state: 0 }
        }
      };

      await this.client.send(payload, this.ipAddress);

      // Get child name for logging
      const sysInfo = await this.strip.getSysInfo();
      const childName = sysInfo.children?.[plugIndex]?.alias || `Plug ${plugIndex}`;

      this.log('info', `Turned OFF plug ${plugIndex} (${childName})`);
      this.emit('plugStateChanged', plugIndex, 'OFF');
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('ECONNRESET') || errorMsg.includes('ETIMEDOUT') || errorMsg.includes('EHOSTUNREACH')) {
        this.log('error', `Connection lost while turning off plug ${plugIndex}: ${errorMsg}`);
        this.handleConnectionLost();
      } else {
        this.log('error', `Failed to turn off plug ${plugIndex}: ${errorMsg}`);
      }
      this.emit('error', error);
      return false;
    }
  }

  async turnOnAll(): Promise<boolean> {
    this.log('info', 'Turning ON all speakers...');
    const results = await Promise.all(
      this.plugIndexes.map(index => this.turnOn(index))
    );
    return results.every(result => result === true);
  }

  async turnOffAll(): Promise<boolean> {
    this.log('info', 'Turning OFF all speakers...');
    const results = await Promise.all(
      this.plugIndexes.map(index => this.turnOff(index))
    );
    return results.every(result => result === true);
  }

  startStatusPolling(): void {
    if (this.statusPollInterval) {
      clearInterval(this.statusPollInterval);
    }

    this.statusPollInterval = setInterval(async () => {
      const status = await this.getStatus();
      this.emit('statusUpdate', status);
    }, STATUS_POLL_INTERVAL);
  }

  stopStatusPolling(): void {
    if (this.statusPollInterval) {
      clearInterval(this.statusPollInterval);
      this.statusPollInterval = null;
    }
  }

  disconnect(): void {
    this.stopStatusPolling();
    this.isConnected = false;
    this.strip = null;
    this.log('info', 'Disconnected from Kasa strip');
    this.emit('disconnected');
  }

  isDeviceConnected(): boolean {
    return this.isConnected;
  }

  updateIpAddress(newIp: string): void {
    this.disconnect();
    this.ipAddress = newIp;
  }

  updatePlugIndexes(indexes: number[]): void {
    this.plugIndexes = indexes;
  }

  private log(level: 'info' | 'warn' | 'error', message: string): void {
    const timestamp = new Date();
    this.emit('log', { timestamp, level, message });
  }
}
