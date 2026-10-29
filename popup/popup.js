const workingOn = document.getElementById("workingOn");
const task = document.getElementById("task");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");

const timerControls = document.getElementById("timerControls");
const timerMinutes = document.getElementById("timerMinutes");
const countdown = document.getElementById("countdown");
const statusMessage = document.getElementById("statusMessage");

const sessionSummary = document.getElementById("sessionSummary");
const completedGoal = document.getElementById("completedGoal");
const completedTime = document.getElementById("completedTime");

const durationButtons = document.querySelectorAll(".duration-btn");

let selectedDuration = 25; // Temporary 25-minute timer for testing
let remainingSeconds = selectedDuration * 60;
let timerInterval = null;
let isPaused = false;

// ==============================
// DURATION SELECTION
// ==============================

durationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (timerInterval || isPaused) return;

    durationButtons.forEach((btn) => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    selectedDuration = Number(button.dataset.duration);
    remainingSeconds = selectedDuration * 60;

    timerMinutes.textContent = selectedDuration;
    countdown.textContent = `${selectedDuration}:00`;
  });
});

// ==============================
// START FOCUS
// ==============================

startBtn.addEventListener("click", () => {
  const workingValue = workingOn.value.trim();
  const taskValue = task.value.trim();

  statusMessage.textContent = "";

  if (workingValue === "") {
    workingOn.classList.add("input-error");
    statusMessage.textContent = "Please enter what you're working on.";
    return;
  }

  if (taskValue === "") {
    task.classList.add("input-error");
    statusMessage.textContent = "Please enter what you want to accomplish.";
    return;
  }

  workingOn.classList.remove("input-error");
  task.classList.remove("input-error");

  sessionSummary.classList.add("hidden");

  chrome.storage.local.set({
    currentGoal: {
      workingOn: workingValue,
      task: taskValue,
    },
  });

  startTimer();
});

// ==============================
// START TIMER
// ==============================

function startTimer() {
  if (timerInterval) return;

  isPaused = false;

  startBtn.classList.add("hidden");
  timerControls.classList.remove("hidden");
  countdown.classList.remove("hidden");

  statusMessage.textContent = `Working on: ${workingOn.value.trim()} • Goal: ${task.value.trim()}`;

  chrome.runtime.sendMessage({
    type: "START_TIMER",
    duration: selectedDuration,
    workingOn: workingOn.value.trim(),
    task: task.value.trim(),
  });

  updateCountdown();

  timerInterval = setInterval(() => {
    if (remainingSeconds > 0) {
      remainingSeconds--;
      updateCountdown();
    }

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;

      countdown.textContent = "00:00";
      timerControls.classList.add("hidden");
      startBtn.classList.remove("hidden");
      pauseBtn.textContent = "Pause";

      statusMessage.textContent = `✅ Goal completed: ${task.value.trim()}`;

      sessionSummary.classList.remove("hidden");
      completedGoal.textContent = `Goal: ${task.value.trim()}`;
      completedTime.textContent = `Focus time: ${selectedDuration} min`;
    }
  }, 1000);
}

// ==============================
// PAUSE / RESUME
// ==============================

pauseBtn.addEventListener("click", () => {
  if (!isPaused) {
    chrome.runtime.sendMessage({ type: "PAUSE_TIMER" });

    clearInterval(timerInterval);
    timerInterval = null;
    isPaused = true;

    pauseBtn.textContent = "Resume";
    statusMessage.textContent = "Focus paused.";
  } else {
    chrome.runtime.sendMessage({
      type: "RESUME_TIMER",
      remainingSeconds: remainingSeconds,
    });

    isPaused = false;
    pauseBtn.textContent = "Pause";

    statusMessage.textContent = `Focusing on: ${task.value.trim()}`;

    timerInterval = setInterval(() => {
      if (remainingSeconds > 0) {
        remainingSeconds--;
        updateCountdown();
      }

      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;

        countdown.textContent = "00:00";
        timerControls.classList.add("hidden");
        startBtn.classList.remove("hidden");
        pauseBtn.textContent = "Pause";

        statusMessage.textContent = `✅ Goal completed: ${task.value.trim()}`;

        sessionSummary.classList.remove("hidden");
        completedGoal.textContent = `Goal: ${task.value.trim()}`;
        completedTime.textContent = `Focus time: ${selectedDuration} min`;
      }
    }, 1000);
  }
});

// ==============================
// STOP TIMER
// ==============================

stopBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "STOP_TIMER" });

  clearInterval(timerInterval);
  timerInterval = null;

  isPaused = false;
  remainingSeconds = selectedDuration * 60;

  countdown.textContent = `${selectedDuration}:00`;

  timerControls.classList.add("hidden");
  countdown.classList.add("hidden");
  startBtn.classList.remove("hidden");

  pauseBtn.textContent = "Pause";
  sessionSummary.classList.add("hidden");

  statusMessage.textContent = "Focus session stopped.";
});

// ==============================
// UPDATE COUNTDOWN
// ==============================

function updateCountdown() {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  countdown.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// ==============================
// RESTORE TIMER STATE
// ==============================

chrome.storage.local.get("timerState", (result) => {
  const state = result.timerState;

  if (!state) return;

  if (state.status === "running") {
    const remaining = Math.max(
      0,
      Math.ceil((state.endTime - Date.now()) / 1000),
    );

    if (remaining <= 0) return;

    remainingSeconds = remaining;
    workingOn.value = state.workingOn || "";
    task.value = state.task || "";

    startBtn.classList.add("hidden");
    timerControls.classList.remove("hidden");
    countdown.classList.remove("hidden");

    updateCountdown();

    timerInterval = setInterval(() => {
      const secondsLeft = Math.max(
        0,
        Math.ceil((state.endTime - Date.now()) / 1000),
      );

      remainingSeconds = secondsLeft;
      updateCountdown();

      if (secondsLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;

        countdown.textContent = "00:00";
        timerControls.classList.add("hidden");
        startBtn.classList.remove("hidden");
        statusMessage.textContent = "🎉 Focus session complete!";
      }
    }, 1000);

    statusMessage.textContent = `Focusing on: ${state.task}`;
  }

  if (state.status === "paused") {
    remainingSeconds = Math.max(
      0,
      Math.ceil((state.endTime - Date.now()) / 1000),
    );

    workingOn.value = state.workingOn || "";
    task.value = state.task || "";

    startBtn.classList.add("hidden");
    timerControls.classList.remove("hidden");
    countdown.classList.remove("hidden");

    updateCountdown();

    isPaused = true;
    pauseBtn.textContent = "Resume";
    statusMessage.textContent = "Focus paused.";
  }
});

// ==============================
// RESTORE SAVED GOAL
// ==============================

chrome.storage.local.get("currentGoal", (result) => {
  const goal = result.currentGoal;

  if (!goal) return;

  workingOn.value = goal.workingOn || "";
  task.value = goal.task || "";
});

// ==============================
// LOAD STATISTICS & SESSION HISTORY
// ==============================

chrome.storage.local.get("focusSessions", (result) => {
  const sessions = result.focusSessions || [];

  // ALL-TIME STATS
  const totalSessions = sessions.length;

  const totalMinutes = sessions.reduce(
    (total, session) => total + Number(session.duration || 0),
    0,
  );

  document.getElementById("totalSessions").textContent = totalSessions;
  document.getElementById("totalMinutes").textContent = totalMinutes;

  // SESSION HISTORY WITH DATE FILTERS
  const sessionList = document.getElementById("sessionList");
  const historyFilter = document.getElementById("historyFilter");

  function renderSessionHistory() {
    if (!sessionList) return;

    const filter = historyFilter ? historyFilter.value : "all";
    const now = new Date();

    let filteredSessions = sessions.filter((session) => {
      return (
        session.completedAt && Number.isFinite(Number(session.completedAt))
      );
    });

    if (filter === "today") {
      filteredSessions = filteredSessions.filter((session) => {
        const date = new Date(Number(session.completedAt));

        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate()
        );
      });
    } else if (filter === "7days" || filter === "30days") {
      const days = filter === "7days" ? 7 : 30;

      const cutoff = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - (days - 1),
      ).getTime();

      filteredSessions = filteredSessions.filter((session) => {
        const completedAt = Number(session.completedAt);

        return completedAt >= cutoff && completedAt <= now.getTime();
      });
    }

    sessionList.innerHTML = "";

    if (filteredSessions.length === 0) {
      const emptyMessage = document.createElement("p");

      emptyMessage.className = "empty-sessions";
      emptyMessage.textContent =
        filter === "all"
          ? "No completed sessions yet."
          : "No sessions found for this period.";

      sessionList.appendChild(emptyMessage);
      return;
    }

    filteredSessions
      .slice()
      .reverse()
      .forEach((session) => {
        const sessionItem = document.createElement("div");
        sessionItem.className = "session-item";

        const date = new Date(Number(session.completedAt));

        const title = document.createElement("strong");
        title.textContent = session.task || "Untitled goal";

        const details = document.createElement("span");
        details.textContent = `${session.workingOn || "Focus"} • ${session.duration} min`;

        const timestamp = document.createElement("small");
        timestamp.textContent = `${date.toLocaleDateString()} • ${date.toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        )}`;

        sessionItem.append(title, details, timestamp);
        sessionList.appendChild(sessionItem);
      });
  }

  if (historyFilter) {
    historyFilter.addEventListener("change", renderSessionHistory);
  }

  renderSessionHistory();

  // 7-DAY FOCUS GRAPH
  const focusChart = document.getElementById("focusChart");

  if (focusChart) {
    focusChart.innerHTML = "";

    const today = new Date();
    const dailyMinutes = [];

    for (let i = 6; i >= 0; i--) {
      const day = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - i,
      );

      const minutes = sessions
        .filter((session) => {
          if (!session.completedAt) return false;

          const completedDate = new Date(Number(session.completedAt));

          return (
            completedDate.getFullYear() === day.getFullYear() &&
            completedDate.getMonth() === day.getMonth() &&
            completedDate.getDate() === day.getDate()
          );
        })
        .reduce((total, session) => total + Number(session.duration || 0), 0);

      dailyMinutes.push({
        day,
        minutes,
        isToday: i === 0,
      });
    }

    const maxMinutes = Math.max(
      ...dailyMinutes.map((item) => item.minutes),
      60,
    );

    dailyMinutes.forEach((item) => {
      const dayColumn = document.createElement("div");
      dayColumn.className = "chart-day";

      const minutesLabel = document.createElement("span");
      minutesLabel.className = "chart-minutes";
      minutesLabel.textContent = item.minutes;

      const barArea = document.createElement("div");
      barArea.className = "chart-bar-area";

      const bar = document.createElement("div");
      bar.className = item.isToday ? "chart-bar today" : "chart-bar";

      bar.style.height =
        item.minutes === 0
          ? "3px"
          : `${Math.max((item.minutes / maxMinutes) * 100, 5)}%`;

      barArea.appendChild(bar);

      const dayLabel = document.createElement("span");
      dayLabel.className = "chart-label";
      dayLabel.textContent = item.isToday
        ? "Today"
        : item.day.toLocaleDateString("en-US", { weekday: "short" });

      dayColumn.append(minutesLabel, barArea, dayLabel);
      focusChart.appendChild(dayColumn);
    });
  }

  // TODAY'S PROGRESS
  const now = new Date();

  const todaySessions = sessions.filter((session) => {
    if (!session.completedAt) return false;

    const completedDate = new Date(Number(session.completedAt));

    return (
      completedDate.getFullYear() === now.getFullYear() &&
      completedDate.getMonth() === now.getMonth() &&
      completedDate.getDate() === now.getDate()
    );
  });

  const todayMinutes = todaySessions.reduce(
    (total, session) => total + Number(session.duration || 0),
    0,
  );

  const dailyGoalSelect = document.getElementById("dailyGoalSelect");

  chrome.storage.local.get("dailyGoal", (goalResult) => {
    const dailyGoal = Number(goalResult.dailyGoal) || 120;

    if (!dailyGoalSelect) return;

    dailyGoalSelect.value = String(dailyGoal);

    function updateDailyProgress(goal) {
      document.getElementById("todaySessions").textContent =
        todaySessions.length;

      document.getElementById("todayMinutes").textContent = todayMinutes;

      const progressPercent = Math.min((todayMinutes / goal) * 100, 100);

      document.getElementById("dailyProgressBar").style.width =
        `${progressPercent}%`;

      document.getElementById("dailyProgressText").textContent =
        `${todayMinutes} of ${goal} minutes completed`;
    }

    updateDailyProgress(dailyGoal);

    dailyGoalSelect.addEventListener("change", () => {
      const newGoal = Number(dailyGoalSelect.value);

      chrome.storage.local.set({ dailyGoal: newGoal }, () => {
        updateDailyProgress(newGoal);
      });
    });
  });
});
