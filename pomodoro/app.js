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

document.getElementById("accent-color").oninput = e => {
    document.documentElement.style.setProperty("--accent", e.target.value);
    localStorage.setItem("accent", e.target.value);
};

const savedAccent = localStorage.getItem("accent");
if (savedAccent) {
    document.documentElement.style.setProperty("--accent", savedAccent);
}

document.getElementById("font-select").onchange = e => {
    document.documentElement.style.setProperty(
        "--font",
        `"${e.target.value}", system-ui`
    );
    localStorage.setItem("font", e.target.value);
};

const savedFont = localStorage.getItem("font");
if (savedFont) {
    document.documentElement.style.setProperty(
        "--font",
        `"${savedFont}", system-ui`
    );
}

let alarmSound = localStorage.getItem("sound") || "sounds/bell.mp3";

document.getElementById("sound-upload").onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    alarmSound = URL.createObjectURL(file);
    localStorage.setItem("sound", alarmSound);
};

new Audio(alarmSound).play();

const settingsBackdrop = document.getElementById("settings-backdrop");
const settingsBtn = document.getElementById("settings-toggle");
const settingsClose = document.getElementById("settings-close");
const settingsOk = document.getElementById("settings-ok");

settingsBtn.onclick = () => {
    settingsBackdrop.hidden = false;
};

settingsClose.onclick = settingsOk.onclick = () => {
    settingsBackdrop.hidden = true;
};

const pomoInput = document.getElementById("pomodoro-min");

pomoInput.onchange = () => {
    duration = pomoInput.value * 60;
    seconds = duration;
    render();
    localStorage.setItem("pomo", pomoInput.value);
};

const saved = localStorage.getItem("pomo");
if (saved) pomoInput.value = saved;

const volume = document.getElementById("alarm-volume");
volume.oninput = () => {
    alarm.volume = volume.value / 100;
};
