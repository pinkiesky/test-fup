export class Logger {
  private readonly _name: string;

  constructor(name: string) {
    this._name = name;
  }

  info(...args: any[]) {
    console.info(`🔵 [${this._name}]`, ...args);
  }

  warn(...args: any[]) {
    // emoji error symbol: https://emojipedia.org/no-entry-sign/
    console.error(`🟡 [${this._name}]`, ...args);
  }

  error(...args: any[]) {
    // emoji error symbol: https://emojipedia.org/no-entry-sign/
    console.error(`🔴 [${this._name}]`, ...args);
  }
}

export function getLogger(name: string) {
  return new Logger(name);
}
