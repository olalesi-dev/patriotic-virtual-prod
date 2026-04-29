import { Elysia } from 'elysia';

// A simple circuit breaker instance wrapper
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  public state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold = 5,
    private resetTimeoutMs = 10_000,
  ) {}

  public recordFailure() {
    this.failures += 1;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  public recordSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  public canProceed(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true; // HALF_OPEN lets one request through
  }
}

export const circuitBreakerPlugin = () => {
  const breaker = new CircuitBreaker();

  return new Elysia({ name: 'custom-circuit-breaker' })
    .decorate('circuitBreaker', breaker)
    .onBeforeHandle({ as: 'global' }, ({ circuitBreaker, set }) => {
      if (!circuitBreaker.canProceed()) {
        set.status = 503;
        return {
          error: 'Service Unavailable (Circuit Breaker OPEN)',
          success: false,
        };
      }
    });
};
