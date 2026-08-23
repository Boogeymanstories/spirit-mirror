import { ParanormalEventType, ParanormalState } from '../types';

const EVENT_TYPES: ParanormalEventType[] = [
  'peripheral_face',
  'reflection_lag',
  'black_frame',
  'wrong_eyes',
  'glass_pulse',
];

export class ParanormalScheduler {
  private timerId: number | null = null;
  private state: ParanormalState = {
    activeEvent: null,
    intensity: 0,
    variant: 0,
    startTime: 0,
    durationMs: 0,
  };
  private onStateChange: ((state: ParanormalState) => void) | null = null;
  private isRunning = false;

  constructor(onStateChange?: (state: ParanormalState) => void) {
    if (onStateChange) {
      this.onStateChange = onStateChange;
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNextEvent();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.state = {
      activeEvent: null,
      intensity: 0,
      variant: 0,
      startTime: 0,
      durationMs: 0,
    };
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  public getState(): ParanormalState {
    return this.state;
  }

  private scheduleNextEvent(): void {
    if (!this.isRunning) return;

    // Trigger randomly every 22 - 48 seconds for realistic unpredictability
    const delay = 22000 + Math.random() * 26000;

    this.timerId = window.setTimeout(() => {
      if (!this.isRunning) return;
      this.triggerRandomEvent();
    }, delay);
  }

  private triggerRandomEvent(): void {
    const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    const duration =
      eventType === 'black_frame'
        ? 180 + Math.random() * 100 // 180-280ms
        : eventType === 'peripheral_face'
        ? 450 + Math.random() * 250 // 450-700ms
        : 400 + Math.random() * 300; // 400-700ms

    this.state = {
      activeEvent: eventType,
      intensity: 0.8 + Math.random() * 0.2,
      variant: Math.random(),
      startTime: performance.now(),
      durationMs: duration,
    };

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }

    // Schedule event completion
    setTimeout(() => {
      if (!this.isRunning) return;
      this.state = {
        ...this.state,
        activeEvent: null,
      };
      if (this.onStateChange) {
        this.onStateChange(this.state);
      }
      this.scheduleNextEvent();
    }, duration);
  }
}
