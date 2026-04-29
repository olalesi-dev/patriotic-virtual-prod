import { describe, expect, it } from 'bun:test';
import { assertChannelAllowedForTopic } from './phi.policy';

describe('assertChannelAllowedForTopic', () => {
  it('blocks SMS for PHI-bearing topics', () => {
    expect(() => assertChannelAllowedForTopic('sms', true)).toThrow(
      'SMS delivery is blocked for PHI-bearing topics.',
    );
  });

  it('allows non-SMS channels for PHI-bearing topics', () => {
    expect(() => assertChannelAllowedForTopic('email', true)).not.toThrow();
    expect(() => assertChannelAllowedForTopic('in_app', true)).not.toThrow();
  });
});
