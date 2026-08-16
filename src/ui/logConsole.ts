import type { LogLevel } from "../core/types";

export class LogConsole {
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Log container #${containerId} not found`);
    this.container = el;
  }

  append(message: string, level: LogLevel = "info") {
    const line = document.createElement("div");
    line.className = `line ${level}`;
    
    const time = document.createElement("span");
    time.className = "time";
    time.textContent = new Date().toLocaleTimeString();

    const msg = document.createElement("span");
    msg.className = "msg";
    msg.textContent = message;

    line.appendChild(time);
    line.appendChild(msg);
    this.container.appendChild(line);
    this.container.scrollTop = this.container.scrollHeight;
  }

  clear() {
    this.container.innerHTML = "";
  }
}
