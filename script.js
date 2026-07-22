const STORAGE_KEY = "simple-alarms-v1";

const clockEl = document.getElementById("clock");
const alarmTimeInput = document.getElementById("alarmTime");
const alarmLabelInput = document.getElementById("alarmLabel");
const repeatDaysWrap = document.getElementById("repeatDays");
const addBtn = document.getElementById("addBtn");
const alarmListEl = document.getElementById("alarmList");
const emptyMsg = document.getElementById("emptyMsg");

const ringModal = document.getElementById("ringModal");
const ringTimeEl = document.getElementById("ringTime");
const ringLabelEl = document.getElementById("ringLabel");
const snoozeBtn = document.getElementById("snoozeBtn");
const stopBtn = document.getElementById("stopBtn");

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

let alarms = loadAlarms();
let selectedDays = new Set();
let activeAlarmId = null;
let audioCtx = null;
let beepInterval = null;
let lastCheckedMinute = null;

function loadAlarms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveAlarms() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function updateClock() {
  const now = new Date();
  clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  checkAlarms(now);
}

function checkAlarms(now) {
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const currentTime = `${hh}:${mm}`;
  const minuteKey = `${now.toDateString()}-${currentTime}`;

  if (now.getSeconds() !== 0 || minuteKey === lastCheckedMinute) return;
  lastCheckedMinute = minuteKey;

  const dow = now.getDay();

  alarms.forEach((alarm) => {
    if (!alarm.enabled || activeAlarmId) return;

    if (alarm.snoozeUntil) {
      if (Date.now() >= alarm.snoozeUntil) {
        alarm.snoozeUntil = null;
        triggerAlarm(alarm);
        saveAlarms();
      }
      return;
    }

    if (alarm.time !== currentTime) return;

    const isRepeating = alarm.days && alarm.days.length > 0;
    if (isRepeating && !alarm.days.includes(dow)) return;

    triggerAlarm(alarm);

    if (!isRepeating) {
      alarm.enabled = false;
    }
    saveAlarms();
    renderAlarms();
  });
}

function triggerAlarm(alarm) {
  activeAlarmId = alarm.id;
  ringTimeEl.textContent = alarm.time;
  ringLabelEl.textContent = alarm.label || "";
  ringModal.classList.remove("hidden");
  startBeep();
}

function startBeep() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const playBeep = () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  };

  playBeep();
  beepInterval = setInterval(playBeep, 600);
}

function stopBeep() {
  if (beepInterval) {
    clearInterval(beepInterval);
    beepInterval = null;
  }
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}

function closeRingModal() {
  ringModal.classList.add("hidden");
  stopBeep();
  activeAlarmId = null;
}

stopBtn.addEventListener("click", () => {
  closeRingModal();
  renderAlarms();
});

snoozeBtn.addEventListener("click", () => {
  const alarm = alarms.find((a) => a.id === activeAlarmId);
  if (alarm) {
    alarm.snoozeUntil = Date.now() + 5 * 60 * 1000;
    alarm.enabled = true;
    saveAlarms();
  }
  closeRingModal();
  renderAlarms();
});

repeatDaysWrap.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-day]");
  if (!btn) return;
  const day = Number(btn.dataset.day);
  if (selectedDays.has(day)) {
    selectedDays.delete(day);
    btn.classList.remove("active");
  } else {
    selectedDays.add(day);
    btn.classList.add("active");
  }
});

addBtn.addEventListener("click", () => {
  const time = alarmTimeInput.value;
  if (!time) {
    alarmTimeInput.focus();
    return;
  }
  const alarm = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    time,
    label: alarmLabelInput.value.trim(),
    days: Array.from(selectedDays).sort(),
    enabled: true,
    snoozeUntil: null,
  };
  alarms.push(alarm);
  alarms.sort((a, b) => a.time.localeCompare(b.time));
  saveAlarms();
  renderAlarms();

  alarmLabelInput.value = "";
  selectedDays.clear();
  repeatDaysWrap.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
});

function renderAlarms() {
  alarmListEl.innerHTML = "";

  if (alarms.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  alarms.forEach((alarm) => {
    const li = document.createElement("li");
    li.className = "alarm-item" + (alarm.enabled ? "" : " disabled");

    const main = document.createElement("div");
    main.className = "alarm-main";

    const timeEl = document.createElement("div");
    timeEl.className = "alarm-time";
    timeEl.textContent = alarm.time;
    main.appendChild(timeEl);

    const meta = document.createElement("div");
    meta.className = "alarm-meta";
    const dayText = alarm.days && alarm.days.length > 0
      ? alarm.days.map((d) => DAY_NAMES[d]).join(" ")
      : "한 번만";
    meta.appendChild(makeSpan(dayText));
    if (alarm.label) meta.appendChild(makeSpan(alarm.label));
    if (alarm.snoozeUntil) meta.appendChild(makeSpan("스누즈 중"));
    main.appendChild(meta);

    li.appendChild(main);

    const actions = document.createElement("div");
    actions.className = "alarm-actions";

    const label = document.createElement("label");
    label.className = "switch";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = alarm.enabled;
    checkbox.addEventListener("change", () => {
      alarm.enabled = checkbox.checked;
      if (!alarm.enabled) alarm.snoozeUntil = null;
      saveAlarms();
      renderAlarms();
    });
    const slider = document.createElement("span");
    slider.className = "slider";
    label.appendChild(checkbox);
    label.appendChild(slider);
    actions.appendChild(label);

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "✕";
    delBtn.addEventListener("click", () => {
      alarms = alarms.filter((a) => a.id !== alarm.id);
      saveAlarms();
      renderAlarms();
    });
    actions.appendChild(delBtn);

    li.appendChild(actions);
    alarmListEl.appendChild(li);
  });
}

function makeSpan(text) {
  const span = document.createElement("span");
  span.textContent = text;
  return span;
}

renderAlarms();
updateClock();
setInterval(updateClock, 1000);
