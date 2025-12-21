let duration = 25 * 60;
let seconds = duration;
let running = false;
let interval;

const timerEl = document.getElementById("timer");

function format(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
}

function render() {
    timerEl.textContent = format(seconds);
}

function start() {
    if (running) return;
    running = true;

    interval = setInterval(() => {
        seconds--;
        render();

        if (seconds <= 0) {
            clearInterval(interval);
            running = false;
            new Audio("sounds/bell.mp3").play();
        }
    }, 1000);
}

function reset() {
    clearInterval(interval);
    running = false;
    seconds = duration;
    render();
}

document.getElementById("start").onclick = start;
document.getElementById("reset").onclick = reset;

render();

const settingsBtn = document.getElementById("settings-toggle");
const settingsPanel = document.getElementById("settings");

settingsBtn.onclick = () => {
    settingsPanel.hidden = !settingsPanel.hidden;
};

