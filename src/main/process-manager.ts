import { ChildProcess } from 'child_process';

export class ProcessManager {
  private static processes: Set<ChildProcess> = new Set();

  static register(process: ChildProcess): void {
    this.processes.add(process);
    process.on('exit', () => this.processes.delete(process));
    process.on('close', () => this.processes.delete(process));
  }

  static terminateAll(): void {
    for (const proc of this.processes) {
      try {
        proc.kill('SIGTERM');
      } catch (error) {
        console.warn('Failed to terminate process', error);
      }
    }

    this.processes.clear();
  }
}
