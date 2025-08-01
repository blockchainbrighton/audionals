// __tests__/eventBus.test.js
import { EventBus } from '../eventBus';

describe('eventBus', () => {
  beforeEach(() => {
    // Clear all listeners between tests
    const listeners = new Map();
    jest.spyOn(document, 'addEventListener');
    jest.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('emit()', () => {
    it('should emit an event with payload', () => {
      const mockCallback = jest.fn();
      const eventType = 'TEST_EVENT';
      const payload = { test: 'data' };

      EventBus.on(eventType, mockCallback);
      EventBus.emit(eventType, payload);

      expect(mockCallback).toHaveBeenCalledWith(payload);
    });

    it('should emit an event without payload', () => {
      const mockCallback = jest.fn();
      const eventType = 'TEST_EVENT_NO_PAYLOAD';

      EventBus.on(eventType, mockCallback);
      EventBus.emit(eventType);

      expect(mockCallback).toHaveBeenCalledWith(undefined);
    });
  });

  describe('on()', () => {
    it('should register a listener and return unsubscribe function', () => {
      const mockCallback = jest.fn();
      const eventType = 'TEST_SUBSCRIBE';
      
      const unsubscribe = EventBus.on(eventType, mockCallback);
      
      // Verify callback was registered
      EventBus.emit(eventType, { test: 'data' });
      expect(mockCallback).toHaveBeenCalledWith({ test: 'data' });
      
      // Test unsubscribe
      unsubscribe();
      mockCallback.mockClear();
      EventBus.emit(eventType, { test: 'after-unsubscribe' });
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle multiple listeners for same event type', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const eventType = 'MULTI_LISTENER_TEST';
      
      EventBus.on(eventType, callback1);
      EventBus.on(eventType, callback2);
      
      EventBus.emit(eventType, { multi: 'test' });
      
      expect(callback1).toHaveBeenCalledWith({ multi: 'test' });
      expect(callback2).toHaveBeenCalledWith({ multi: 'test' });
    });
  });

  describe('off()', () => {
    it('should remove a specific listener', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const eventType = 'UNSUBSCRIBE_TEST';
      
      EventBus.on(eventType, callback1);
      EventBus.on(eventType, callback2);
      
      // Remove only callback1
      EventBus.off(eventType, callback1);
      
      EventBus.emit(eventType, { test: 'unsub' });
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith({ test: 'unsub' });
    });

    it('should handle removing non-existent listener gracefully', () => {
      const callback = jest.fn();
      const eventType = 'NON_EXISTENT_TEST';
      
      // This should not throw an error
      expect(() => EventBus.off(eventType, callback)).not.toThrow();
    });
  });

  describe('event flow', () => {
    it('should maintain separate event types', () => {
      const callbackA = jest.fn();
      const callbackB = jest.fn();
      
      EventBus.on('EVENT_A', callbackA);
      EventBus.on('EVENT_B', callbackB);
      
      EventBus.emit('EVENT_A', { data: 'a' });
      EventBus.emit('EVENT_B', { data: 'b' });
      
      expect(callbackA).toHaveBeenCalledWith({ data: 'a' });
      expect(callbackB).toHaveBeenCalledWith({ data: 'b' });
      
      // Ensure no cross-contamination
      expect(callbackA).not.toHaveBeenCalledWith({ data: 'b' });
      expect(callbackB).not.toHaveBeenCalledWith({ data: 'a' });
    });
  });
});