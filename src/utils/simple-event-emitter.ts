/**
 * Simplified event emitter using observer pattern
 * Replaces the complex Node.js EventEmitter with a lightweight implementation
 */
export class SimpleEventEmitter<T> {
  private listeners: Array<(event: T) => void> = [];
  
  /**
   * Add an event listener
   */
  on(listener: (event: T) => void): void {
    this.listeners.push(listener);
  }
  
  /**
   * Remove an event listener
   */
  off(listener: (event: T) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  /**
   * Emit an event to all listeners
   */
  emit(event: T): void {
    // Use a copy of the listeners array to avoid issues if listeners are modified during emission
    const currentListeners = [...this.listeners];
    currentListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        // Silently ignore listener errors to prevent one bad listener from breaking others
        console.warn('Event listener error:', error);
      }
    });
  }
  
  /**
   * Remove all listeners
   */
  clear(): void {
    this.listeners = [];
  }
  
  /**
   * Get the number of active listeners
   */
  listenerCount(): number {
    return this.listeners.length;
  }
}

/**
 * Create a typed event emitter for orchestrator events
 */
export function createOrchestratorEventEmitter() {
  return new SimpleEventEmitter<any>();
}