let timerState = {
  status: "idle",
  endTime: null,
  duration: 0,
  workingOn: "",
  task: "",
};

// ==============================
// START TIMER
// ==============================

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "START_TIMER") {
    const endTime = Date.now() + message.duration * 60 * 1000;

    timerState = {
      status: "running",
      endTime: endTime,
      duration: message.duration,
      workingOn: message.workingOn,
      task: message.task,
    };

    // Save timer state
    chrome.storage.local.set({
      timerState: timerState,
    });

    // Schedule timer completion
    chrome.alarms.create("fokusTimer", {
      when: endTime,
    });
  }

  // ==============================
  // PAUSE TIMER
  // ==============================

  if (message.type === "PAUSE_TIMER") {
    chrome.alarms.clear("fokusTimer");

    timerState.status = "paused";

    chrome.storage.local.set({
      timerState: timerState,
    });
  }

  // ==============================
  // RESUME TIMER
  // ==============================

  if (message.type === "RESUME_TIMER") {
    const endTime = Date.now() + message.remainingSeconds * 1000;

    timerState.endTime = endTime;
    timerState.status = "running";

    chrome.storage.local.set({
      timerState: timerState,
    });

    chrome.alarms.create("fokusTimer", {
      when: endTime,
    });
  }

  // ==============================
  // STOP TIMER
  // ==============================

  if (message.type === "STOP_TIMER") {
    chrome.alarms.clear("fokusTimer");

    timerState = {
      status: "idle",
      endTime: null,
      duration: 0,
      workingOn: "",
      task: "",
    };

    chrome.storage.local.set({
      timerState: timerState,
    });
  }
});

// ==============================
// TIMER FINISHED
// ==============================

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "fokusTimer") {
    return;
  }

  chrome.storage.local.get("timerState", (result) => {
    const state = result.timerState;

    if (!state || state.status !== "running") {
      return;
    }

    // Mark timer as completed
    timerState = {
      status: "completed",
      endTime: null,
      duration: state.duration,
      workingOn: state.workingOn,
      task: state.task,
    };

    chrome.storage.local.set({
      timerState: timerState,
    });

    // ==============================
    // SAVE COMPLETED SESSION
    // ==============================

    chrome.storage.local.get("focusSessions", (result) => {
      const sessions = result.focusSessions || [];

      sessions.push({
        workingOn: state.workingOn,
        task: state.task,
        duration: state.duration,
        completedAt: Date.now(),
      });

      chrome.storage.local.set({
        focusSessions: sessions,
      });
    });

    // ==============================
    // COMPLETION NOTIFICATION
    // ==============================

    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title: "Fokus",
      message: `Working on: ${state.workingOn}\nGoal completed: ${state.task}`,
      priority: 2,
    });
  });
});
