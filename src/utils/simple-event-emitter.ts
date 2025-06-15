export class SimpleEventEmitter<T> {
  private listeners: Array<(event: T) => void> = [];
  
  on(listener: (event: T) => void): void {
    this.listeners.push(listener);
  }
  
  off(listener: (event: T) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  emit(event: T): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }
  
  clear(): void {
    this.listeners = [];
  }
  
  listenerCount(): number {
    return this.listeners.length;
  }
}