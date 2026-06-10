import { clientRequestId } from '@/src/shell/client-request-id';

describe('clientRequestId', () => {
  it('produces a v4 uuid', () => {
    expect(clientRequestId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('is unique across calls', () => {
    expect(clientRequestId()).not.toBe(clientRequestId());
  });
});
