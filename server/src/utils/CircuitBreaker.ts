export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of consecutive errors to trip open (e.g. 5)
  resetTimeoutMs: number;   // Time in ms to stay OPEN before HALF_OPEN test (e.g. 15,000ms)
}

export class CircuitBreaker {
  readonly name: string;
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(name: string, options: Partial<CircuitBreakerOptions> = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 15_000;
  }

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      }
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const current = this.getState();

    if (current === 'OPEN') {
      throw new Error(`CIRCUIT_OPEN: Provider ${this.name} circuit is open. Fast failing request.`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err: any) {
      const msg = String(err?.message || '');
      const isClientError =
        msg.includes('404') ||
        msg.includes('400') ||
        msg.includes('TRAIN_NOT_FOUND') ||
        msg.toLowerCase().includes('not found');

      if (!isClientError) {
        this.onFailure();
      }
      throw err;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`[CircuitBreaker] Provider '${this.name}' circuit TRIPPED OPEN after ${this.failureCount} errors.`);
    }
  }
}
