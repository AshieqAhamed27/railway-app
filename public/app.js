const state = {
  bootstrap: null,
  selectedTripId: null,
  refreshTimer: null
};

const els = {
  connectionStatus: document.querySelector("#connectionStatus"),
  resetDemoButton: document.querySelector("#resetDemoButton"),
  activeTripCount: document.querySelector("#activeTripCount"),
  tripList: document.querySelector("#tripList"),
  addTripForm: document.querySelector("#addTripForm"),
  trainSelect: document.querySelector("#trainSelect"),
  boardingStationSelect: document.querySelector("#boardingStationSelect"),
  destinationStationSelect: document.querySelector("#destinationStationSelect"),
  heroTrain: document.querySelector("#heroTrain"),
  heroTitle: document.querySelector("#heroTitle"),
  heroAction: document.querySelector("#heroAction"),
  currentPlatform: document.querySelector("#currentPlatform"),
  platformConfidence: document.querySelector("#platformConfidence"),
  riskBadge: document.querySelector("#riskBadge"),
  departureMetric: document.querySelector("#departureMetric"),
  walkMetric: document.querySelector("#walkMetric"),
  marginMetric: document.querySelector("#marginMetric"),
  confidenceBar: document.querySelector("#confidenceBar"),
  routeSummary: document.querySelector("#routeSummary"),
  stationMap: document.querySelector("#stationMap"),
  routeSteps: document.querySelector("#routeSteps"),
  timeline: document.querySelector("#timeline"),
  stateVersion: document.querySelector("#stateVersion"),
  alerts: document.querySelector("#alerts"),
  alertCount: document.querySelector("#alertCount"),
  crowdForm: document.querySelector("#crowdForm"),
  crowdPlatform: document.querySelector("#crowdPlatform"),
  opsForm: document.querySelector("#opsForm"),
  opsPlatform: document.querySelector("#opsPlatform"),
  opsMetrics: document.querySelector("#opsMetrics"),
  opsHealth: document.querySelector("#opsHealth"),
  toast: document.querySelector("#toast")
};

function formatTime(iso) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

function formatAge(iso) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function pct(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 2400);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Request failed");
  }
  return payload;
}

async function refresh() {
  state.bootstrap = await api("/api/bootstrap");
  if (!state.selectedTripId || !state.bootstrap.tripCards.some((card) => card.trip.id === state.selectedTripId)) {
    state.selectedTripId = state.bootstrap.tripCards[0]?.trip.id ?? null;
  }
  render();
}

function selectedCard() {
  return state.bootstrap?.tripCards.find((card) => card.trip.id === state.selectedTripId) ?? state.bootstrap?.tripCards[0] ?? null;
}

function renderSelects() {
  if (!state.bootstrap) return;
  els.trainSelect.innerHTML = state.bootstrap.trains.map((train) => (
    `<option value="${train.trainNumber}">${train.trainNumber} ${train.name}</option>`
  )).join("");
  const stationOptions = state.bootstrap.stations.map((station) => (
    `<option value="${station.code}">${station.code} ${station.name}</option>`
  )).join("");
  els.boardingStationSelect.innerHTML = stationOptions;
  els.destinationStationSelect.innerHTML = stationOptions;
  els.boardingStationSelect.value = "NDLS";
  els.destinationStationSelect.value = "CSMT";
}

function renderTrips() {
  const cards = state.bootstrap?.tripCards ?? [];
  els.activeTripCount.textContent = `${cards.length} active`;
  els.tripList.innerHTML = cards.map((card) => {
    const selected = card.trip.id === state.selectedTripId;
    const severity = card.risk.severity;
    return `
      <button class="trip-button" type="button" data-trip-id="${card.trip.id}" aria-selected="${selected}">
        <strong>${card.train.trainNumber} ${card.train.name}</strong>
        <small>${card.trip.passengerName} from ${card.boardingStation.code} to ${card.trip.destinationStationCode}</small>
        <span class="badge ${severity}">${severity.toUpperCase()} · Platform ${card.platformState.currentPlatform}</span>
      </button>
    `;
  }).join("");
}

function renderHero(card) {
  if (!card) return;
  const platform = card.platformState;
  const risk = card.risk;
  const changed = platform.previousPlatform && platform.previousPlatform !== platform.currentPlatform;

  els.heroTrain.textContent = `${card.train.trainNumber} ${card.train.name} · ${card.boardingStation.name}`;
  els.heroTitle.textContent = changed
    ? `Platform moved from ${platform.previousPlatform} to ${platform.currentPlatform}`
    : `${platform.currentPlatform ? `Platform ${platform.currentPlatform}` : "Platform pending"} for boarding`;
  els.heroAction.textContent = risk.nextAction;
  els.currentPlatform.textContent = platform.currentPlatform || "--";
  els.platformConfidence.textContent = `${platform.stateKind.replaceAll("_", " ")} · ${pct(platform.confidence)}`;
  els.riskBadge.textContent = risk.severity.toUpperCase();
  els.riskBadge.className = `badge ${risk.severity}`;
  els.departureMetric.textContent = `${risk.minutesUntilDeparture} min`;
  els.walkMetric.textContent = `${risk.walkingMinutes} min`;
  els.marginMetric.textContent = `${risk.marginMinutes} min`;
  els.confidenceBar.style.width = pct(platform.confidence);
  els.stateVersion.textContent = `v${platform.platformStateVersion}`;
  els.routeSummary.textContent = `${Math.round(card.route.distanceMeters)} m`;
  els.crowdPlatform.value = platform.currentPlatform || "";
  els.opsPlatform.value = platform.currentPlatform || "";
}

function renderMap(card) {
  const station = card.boardingStation;
  const activeAreaIds = new Set([
    card.trip.currentAreaId,
    ...(card.route.steps || []).map((step) => {
      const area = station.areas?.find((item) => item.name === step.to);
      return area?.id;
    }).filter(Boolean),
    `platform-${card.platformState.currentPlatform}`
  ]);

  if (!station.areas?.length) {
    els.stationMap.innerHTML = `<div class="map-node active" style="left:50%;top:50%">Platform ${card.platformState.currentPlatform}</div>`;
    return;
  }

  const nodes = station.areas.map((area) => {
    const classes = [
      "map-node",
      area.kind === "platform" ? "platform" : "",
      activeAreaIds.has(area.id) ? "active" : "",
      area.id === card.trip.currentAreaId ? "current" : ""
    ].filter(Boolean).join(" ");
    const label = area.platformNumber ? `P${area.platformNumber}` : area.name;
    return `<span class="${classes}" style="left:${area.x}%;top:${area.y}%">${label}</span>`;
  }).join("");

  els.stationMap.innerHTML = `<span class="route-line"></span>${nodes}`;
}

function renderRoute(card) {
  els.routeSteps.innerHTML = card.route.steps.map((step) => (
    `<li>${step.from} to ${step.to} · ${step.mode} · ${Math.ceil(step.expectedSeconds / 60)} min</li>`
  )).join("");
}

function renderTimeline(card) {
  els.timeline.innerHTML = card.timeline.map((event) => `
    <div class="timeline-item">
      <strong>${event.sourceName} · Platform ${event.platformNumber}</strong>
      <small>${event.assignmentKind} · ${event.sourceKind.replaceAll("_", " ")} · ${pct(event.sourceConfidence)} · ${formatAge(event.observedAt)}</small>
      <small>${event.summary || ""}</small>
    </div>
  `).join("");
}

function renderAlerts(card) {
  els.alertCount.textContent = String(card.alerts.length);
  els.alerts.innerHTML = card.alerts.length ? card.alerts.map((alert) => `
    <div class="alert-item ${alert.severity}">
      <strong>${alert.title}</strong>
      ${alert.trainNumber ? `<small>Train ${alert.trainNumber} - ${alert.stationCode || card.boardingStation.code} - Platform ${alert.previousPlatform || card.platformState.plannedPlatform || "--"} to ${alert.currentPlatform || card.platformState.currentPlatform}</small>` : ""}
      <small>${alert.body}</small>
      <small>${formatAge(alert.createdAt)} · ${pct(alert.confidence)} confidence</small>
      ${alert.acknowledged ? "<small>Acknowledged</small>" : `<button class="alert-action" type="button" data-alert-id="${alert.id}">Acknowledge</button>`}
    </div>
  `).join("") : `<div class="alert-item"><strong>No active alerts</strong><small>Realtime stream is connected.</small></div>`;
}

function renderOps() {
  const metrics = state.bootstrap?.metrics;
  const incidents = state.bootstrap?.incidents ?? [];
  els.opsHealth.textContent = incidents.length ? `${incidents.length} open` : "Healthy";
  els.opsMetrics.innerHTML = `
    <div class="ops-metric">
      <strong>${metrics.activeTrips}</strong>
      <small>Active trips</small>
    </div>
    <div class="ops-metric">
      <strong>${metrics.acceptedCrowdReports}</strong>
      <small>Accepted crowd reports</small>
    </div>
    <div class="ops-metric">
      <strong>${metrics.openIncidents}</strong>
      <small>Open data incidents</small>
    </div>
  `;
}

function render() {
  if (!state.bootstrap) return;
  renderSelects();
  renderTrips();
  const card = selectedCard();
  if (!card) return;
  renderHero(card);
  renderMap(card);
  renderRoute(card);
  renderTimeline(card);
  renderAlerts(card);
  renderOps();
}

function setupEvents() {
  els.tripList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-trip-id]");
    if (!button) return;
    state.selectedTripId = button.dataset.tripId;
    render();
  });

  els.addTripForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(els.addTripForm));
    try {
      const tripCard = await api("/api/trips", {
        method: "POST",
        body: JSON.stringify(body)
      });
      state.selectedTripId = tripCard.trip.id;
      await refresh();
      showToast("Trip added");
    } catch (error) {
      showToast(error.message);
    }
  });

  els.crowdForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const card = selectedCard();
    if (!card) return;
    const form = new FormData(els.crowdForm);
    const body = {
      tripId: card.trip.id,
      trainNumber: card.train.trainNumber,
      stationCode: card.boardingStation.code,
      reportedPlatform: form.get("reportedPlatform"),
      voteKind: form.get("voteKind"),
      mediaProvided: form.get("mediaProvided") === "on"
    };
    try {
      const result = await api("/api/crowd-reports", {
        method: "POST",
        body: JSON.stringify(body)
      });
      await refresh();
      showToast(result.accepted ? "Crowd report accepted" : "Crowd report held for review");
    } catch (error) {
      showToast(error.message);
    }
  });

  els.opsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const card = selectedCard();
    if (!card) return;
    const form = new FormData(els.opsForm);
    const body = {
      trainNumber: card.train.trainNumber,
      stationCode: card.boardingStation.code,
      sourceKind: form.get("sourceKind"),
      platformNumber: form.get("platformNumber"),
      sourceConfidence: Number(form.get("sourceConfidence")),
      assignmentKind: form.get("assignmentKind")
    };
    try {
      await api("/api/platform-events", {
        method: "POST",
        body: JSON.stringify(body)
      });
      await refresh();
      showToast("Platform event published");
    } catch (error) {
      showToast(error.message);
    }
  });

  els.alerts.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-alert-id]");
    if (!button) return;
    try {
      await api(`/api/alerts/${button.dataset.alertId}/ack`, { method: "POST" });
      await refresh();
      showToast("Alert acknowledged");
    } catch (error) {
      showToast(error.message);
    }
  });

  els.resetDemoButton.addEventListener("click", async () => {
    try {
      await api("/api/reset-demo", { method: "POST" });
      state.selectedTripId = null;
      await refresh();
      showToast("Demo reset");
    } catch (error) {
      showToast(error.message);
    }
  });
}

function connectRealtime() {
  const events = new EventSource("/events");
  events.addEventListener("ready", () => {
    els.connectionStatus.textContent = "Live";
  });
  events.addEventListener("heartbeat", () => {
    els.connectionStatus.textContent = "Live";
  });
  for (const eventName of ["platform.resolved", "alert.created", "crowd.reported", "trip.created", "demo.reset"]) {
    events.addEventListener(eventName, async () => {
      await refresh();
    });
  }
  events.onerror = () => {
    els.connectionStatus.textContent = "Reconnecting";
  };
}

setupEvents();
connectRealtime();
refresh().catch((error) => showToast(error.message));
