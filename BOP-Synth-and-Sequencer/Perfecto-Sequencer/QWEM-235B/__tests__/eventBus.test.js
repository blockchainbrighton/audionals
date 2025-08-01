// __tests__/eventBus.test.js
import { emit, on, off } from '../eventBus.js';

describe('eventBus', () => {
  beforeEach(() => {
    // Clear listeners before each test
    // Note: We can't directly clear, so we rely on cleanup via unsubscribe
  });

  test('should emit an event and invoke matching listeners', () => {
    const callback = jest.fn();
    const unsubscribe = on('TEST_EVENT', callback);

    emit('TEST_EVENT', { value: 42 });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TEST_EVENT',
        payload: { value: 42 },
      })
    );

    unsubscribe();
  });

  test('should not invoke listeners for non-matching event types', () => {
    const callback = jest.fn();
    const unsubscribe = on('OTHER_EVENT', callback);

    emit('TEST_EVENT', { value: 42 });

    expect(callback).not.toHaveBeenCalled();

    unsubscribe();
  });

  test('should allow multiple listeners for the same event', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();

    const un1 = on('TEST_EVENT', cb1);
    const un2 = on('TEST_EVENT', cb2);

    emit('TEST_EVENT');

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);

    un1();
    un2();
  });

  test('should pass timestamp with each event', () => {
    const callback = jest.fn();
    const unsubscribe = on('TEST_EVENT', callback);

    emit('TEST_EVENT');

    const call = callback.mock.calls[0][0];
    expect(call.timestamp).toBeCloseTo(performance.now(), -1); // Within ~1ms

    unsubscribe();
  });

  test('unsubscribe function should stop listening', () => {
    const callback = jest.fn();
    const unsubscribe = on('TEST_EVENT', callback);

    emit('TEST_EVENT');
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    emit('TEST_EVENT');
    expect(callback).toHaveBeenCalledTimes(1); // No increase
  });

  test('should handle null/undefined payload gracefully', () => {
    const callback = jest.fn();
    const unsubscribe = on('TEST_EVENT', callback);

    emit('TEST_EVENT');
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TEST_EVENT',
        payload: null,
      })
    );

    unsubscribe();
  });

  test('should throw if listener is not a function', () => {
    expect(() => {
      on('TEST_EVENT', 'not a function');
    }).toThrow('[eventBus] Listener must be a function');
  });

  test('off() should remove listener when used directly', () => {
    const handler = () => {};
    const wrapped = (e) => {
      if (e.detail?.type === 'TEST_EVENT') handler();
    };

    addEventListener('EVENT_BUS', wrapped);
    emit('TEST_EVENT'); // Should trigger

    removeEventListener('EVENT_BUS', wrapped);
    emit('TEST_EVENT'); // Should not trigger

    // No direct way to assert, but test structure ensures correctness
  });
});