export class SimpleEventEmitter<T> {
  private listeners: Array<(event: T) => void> = [];
  
  on(listener: (event: T) => void): void {
    this.listeners.push(listener);
  }
  
  emit(event: T): void {
    this.listeners.forEach(listener => listener(event));
  }
  
  removeListener(listener: (event: T) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  removeAllListeners(): void {
    this.listeners = [];
  }
}