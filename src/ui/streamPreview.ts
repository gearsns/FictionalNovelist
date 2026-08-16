export function initStreamPreview() {
    const streamBarEl = document.querySelector<HTMLDivElement>("#stream-bar")!;
    const streamTextEl = document.querySelector<HTMLSpanElement>("#stream-text")!;
    let streamRaf = 0;
    let pendingStreamText: string | null = null;

    function updateStreamPreview(fullText: string) {
        pendingStreamText = fullText;
        if (streamRaf) return;
        streamRaf = requestAnimationFrame(() => {
            streamRaf = 0;
            if (pendingStreamText === null) return;
            streamBarEl.classList.add("active");
            const flat = pendingStreamText.replace(/\s+/g, " ").trim();
            streamTextEl.textContent = flat.slice(-220);
            streamTextEl.scrollLeft = streamTextEl.scrollWidth;
        });
    }

    function resetStreamPreview(idleLabel = "待機中") {
        pendingStreamText = null;
        streamBarEl.classList.remove("active");
        streamTextEl.textContent = idleLabel;
    }

    return { updateStreamPreview, resetStreamPreview };
}
