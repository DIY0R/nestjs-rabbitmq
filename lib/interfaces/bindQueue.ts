export interface BindQueue {
  queue: string;
  source: string;
  pattern: string;
  args?: Record<string, any>;
}
