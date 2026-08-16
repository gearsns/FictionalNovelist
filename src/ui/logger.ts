import type { LogLevel } from "../core/types";

export function createLogger(consoleEl: HTMLDivElement) {
    function appendLog(message: string, level: LogLevel = "info") {
        const line = document.createElement("div");
        line.className = `line ${level}`;
        const time = new Date().toLocaleTimeString("ja-JP", { hour12: false });
        line.innerHTML = `<span class="time">${time}</span><span class="msg"></span>`;
        line.querySelector(".msg")!.textContent = message;
        consoleEl.appendChild(line);
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    function clearLog() {
        consoleEl.innerHTML = "";
    }

    return { appendLog, clearLog };
}
