const state = {
  bootstrap: null,
  account: null,
  token: window.localStorage.getItem("railwayToken") || "",
  selectedTripId: null,
  currentOffers: [],
  selectedOfferId: null,
  liveTrains: [],
  toastTimer: null
};

const els = {
  connectionStatus: document.querySelector("#connectionStatus"),
  userChip: document.querySelector("#userChip"),
  authPanel: document.querySelector("#authPanel"),
  signupForm: document.querySelector("#signupForm"),
  loginForm: document.querySelector("#loginForm"),
  resetDataButton: document.querySelector("#resetDataButton"),
  searchForm: document.querySelector("#searchForm"),
  swapRouteButton: document.querySelector("#swapRouteButton"),
  resultCount: document.querySelector("#resultCount"),
  selectedRouteLabel: document.querySelector("#selectedRouteLabel"),
  activeTripCount: document.querySelector("#activeTripCount"),
  tripList: document.querySelector("#tripList"),
  addTripForm: document.querySelector("#addTripForm"),
  boardingStationSelect: document.querySelector("#boardingStationSelect"),
  destinationStationSelect: document.querySelector("#destinationStationSelect"),
  stationSuggestions: document.querySelector("#stationSuggestions"),
  bookingClassSelect: document.querySelector("#bookingClassSelect"),
  quotaSelect: document.querySelector("#quotaSelect"),
  serviceDateInput: document.querySelector("#serviceDateInput"),
  bookingOffers: document.querySelector("#bookingOffers"),
  selectedOfferSummary: document.querySelector("#selectedOfferSummary"),
  checkoutStatus: document.querySelector("#checkoutStatus"),
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
  pnrForm: document.querySelector("#pnrForm"),
  pnrInput: document.querySelector("#pnrInput"),
  pnrStatus: document.querySelector("#pnrStatus"),
  liveTrainForm: document.querySelector("#liveTrainForm"),
  liveTrainInput: document.querySelector("#liveTrainInput"),
  liveTrainStatus: document.querySelector("#liveTrainStatus"),
  liveTrainResults: document.querySelector("#liveTrainResults"),
  crowdForm: document.querySelector("#crowdForm"),
  crowdPlatform: document.querySelector("#crowdPlatform"),
  opsForm: document.querySelector("#opsForm"),
  opsPlatform: document.querySelector("#opsPlatform"),
  opsMetrics: document.querySelector("#opsMetrics"),
  opsHealth: document.querySelector("#opsHealth"),
  toast: document.querySelector("#toast")
};

const htmlEscapes = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

function formatTime(iso) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

function formatAge(iso) {
  if (!iso) return "just now";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function formatMoney(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDuration(hours) {
  const totalMinutes = Math.round(Number(hours || 0) * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`;
}

function pct(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function todayInIndia() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
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

function stationName(code) {
  const station = state.bootstrap?.stations.find((item) => item.code === code);
  return station ? `${station.code} ${station.name}` : code;
}

function stationLabel(station) {
  return `${station.code} - ${station.name}, ${station.city}`;
}

function stationValue(code) {
  const station = state.bootstrap?.stations.find((item) => item.code === code);
  return station ? stationLabel(station) : code;
}

function resolveStationCode(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const explicitCode = raw.split(/[\s-]/)[0]?.toUpperCase();
  const match = state.bootstrap?.stations.find((station) => (
    station.code === explicitCode ||
    station.code === raw.toUpperCase() ||
    station.name.toLowerCase() === raw.toLowerCase() ||
    `${station.code} - ${station.name}, ${station.city}`.toLowerCase() === raw.toLowerCase()
  ));
  return match?.code ?? explicitCode;
}

function selectedOffer() {
  return state.currentOffers.find((offer) => offer.id === state.selectedOfferId) ?? state.currentOffers[0] ?? null;
}

async function refresh() {
  state.bootstrap = await api("/api/bootstrap");
  if (state.token && !state.account) {
    try {
      const result = await api("/api/auth/me");
      state.account = result.account;
      if (!state.account) {
        state.token = "";
        window.localStorage.removeItem("railwayToken");
      }
    } catch {
      state.token = "";
      window.localStorage.removeItem("railwayToken");
    }
  }
  if (!state.currentOffers.length) {
    state.currentOffers = state.bootstrap.bookingOffers ?? [];
    state.selectedOfferId = state.currentOffers[0]?.id ?? null;
  }
  if (!state.liveTrains.length) {
    try {
      const live = await api("/api/trains/live?q=");
      state.liveTrains = live.trains.slice(0, 5);
    } catch {
      state.liveTrains = [];
    }
  }
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
  if (!els.stationSuggestions.childElementCount) {
    els.stationSuggestions.innerHTML = state.bootstrap.stations.map((station) => (
      `<option value="${escapeHtml(stationLabel(station))}">${escapeHtml(station.state)} - ${escapeHtml(station.zone || "Indian Railways")}</option>`
    )).join("");
  }
  if (!els.boardingStationSelect.value) {
    els.boardingStationSelect.value = stationValue("NDLS");
  }
  if (!els.destinationStationSelect.value) {
    els.destinationStationSelect.value = stationValue("MMCT");
  }

  if (!els.serviceDateInput.value) {
    els.serviceDateInput.value = todayInIndia();
  }
}

function renderBookingOffers(offers) {
  state.currentOffers = offers;
  if (!offers.some((offer) => offer.id === state.selectedOfferId)) {
    state.selectedOfferId = offers[0]?.id ?? null;
  }

  els.resultCount.textContent = offers.length === 1 ? "1 train" : `${offers.length} trains`;
  els.selectedRouteLabel.textContent = `${resolveStationCode(els.boardingStationSelect.value)} to ${resolveStationCode(els.destinationStationSelect.value)}`;

  els.bookingOffers.innerHTML = offers.length ? offers.map((offer) => {
    const selected = offer.id === state.selectedOfferId;
    const delayMinutes = Math.round(Number(offer.delaySeconds || 0) / 60);
    const platform = offer.platformNumber ? `Platform ${offer.platformNumber}` : "Platform pending";
    return `
      <label class="train-card ${selected ? "selected" : ""}" data-offer-id="${offer.id}">
        <input type="radio" name="offerId" value="${offer.id}" ${selected ? "checked" : ""}>
        <span class="train-card-main">
          <span class="train-title">
            <strong>${offer.trainNumber} ${escapeHtml(offer.trainName)}</strong>
            <em>${escapeHtml(offer.serviceType || "Train")}</em>
          </span>
          <span class="journey-line">
            <b>${formatTime(offer.departureAt)}</b>
            <span>${offer.fromStationCode}</span>
            <i></i>
            <b>${formatTime(offer.arrivalAt)}</b>
            <span>${offer.toStationCode}</span>
          </span>
          <span class="result-meta">
            <small>${formatDuration(offer.journeyHours)}</small>
            <small>${platform}</small>
            <small>${delayMinutes ? `${delayMinutes} min delay` : "On time"}</small>
          </span>
        </span>
        <span class="fare-block">
          <strong>${formatMoney(offer.fare, offer.currency)}</strong>
          <small>${escapeHtml(offer.classLabel)} - ${offer.availableSeats} seats</small>
          <span class="status-pill">${escapeHtml(offer.status)}</span>
        </span>
      </label>
    `;
  }).join("") : `
    <div class="empty-card">
      <strong>No direct trains found</strong>
      <small>Try a different route, travel class, or date.</small>
    </div>
  `;

  renderSelectedOfferSummary();
}

function renderSelectedOfferSummary() {
  const offer = selectedOffer();
  const submitButton = els.addTripForm.querySelector("button[type='submit']");
  submitButton.disabled = !offer || !state.account;

  if (!offer) {
    els.checkoutStatus.textContent = "Select train";
    els.selectedOfferSummary.innerHTML = `
      <strong>No train selected</strong>
      <small>Search a route and choose one available train to continue.</small>
    `;
    return;
  }

  els.checkoutStatus.textContent = state.account ? offer.status : "Sign in";
  const delayMinutes = Math.round(Number(offer.delaySeconds || 0) / 60);
  els.selectedOfferSummary.innerHTML = `
    <div>
      <strong>${offer.trainNumber} ${escapeHtml(offer.trainName)}</strong>
      <small>${stationName(offer.fromStationCode)} to ${stationName(offer.toStationCode)}</small>
    </div>
    <dl class="fare-summary">
      <div><dt>Class</dt><dd>${escapeHtml(offer.classLabel)}</dd></div>
      <div><dt>Departure</dt><dd>${formatTime(offer.departureAt)}</dd></div>
      <div><dt>Seats</dt><dd>${offer.availableSeats}</dd></div>
      <div><dt>Platform</dt><dd>${offer.platformNumber || "Pending"}</dd></div>
      <div><dt>Delay</dt><dd>${delayMinutes ? `${delayMinutes} min` : "On time"}</dd></div>
      <div><dt>Total</dt><dd>${formatMoney(offer.fare, offer.currency)}</dd></div>
    </dl>
  `;
}

function renderAuth() {
  const signedIn = Boolean(state.account);
  els.authPanel.classList.toggle("signed-in", signedIn);
  els.userChip.textContent = signedIn ? state.account.name : "Guest";
  if (signedIn) {
    els.authPanel.innerHTML = `
      <div>
        <p class="eyebrow">Passenger Account</p>
        <h2>${escapeHtml(state.account.name)}</h2>
        <small>${escapeHtml(state.account.email)} ${state.account.mobile ? `- ${escapeHtml(state.account.mobile)}` : ""}</small>
      </div>
      <button class="ghost-button" id="signOutButton" type="button">Sign Out</button>
    `;
    document.querySelector("#signOutButton").addEventListener("click", () => {
      state.account = null;
      state.token = "";
      window.localStorage.removeItem("railwayToken");
      window.location.reload();
    });
  }
}

function renderLiveTrains() {
  const trains = state.liveTrains.length
    ? state.liveTrains
    : (state.bootstrap?.trains || []).slice(0, 5).map((train) => ({
      trainNumber: train.trainNumber,
      trainName: train.name,
      serviceType: train.serviceType,
      status: "scheduled",
      delaySeconds: 0,
      currentPlatform: null,
      message: `${train.trainNumber} ${train.name}`
    }));

  els.liveTrainStatus.textContent = `${state.bootstrap?.metrics?.liveTrains ?? trains.length} tracked`;
  els.liveTrainResults.innerHTML = trains.map((train) => {
    const delayMinutes = Math.round(Number(train.delaySeconds || 0) / 60);
    const changed = train.platformChanged ? "changed" : "confirmed";
    return `
      <div class="live-train-card">
        <strong>${train.trainNumber} ${escapeHtml(train.trainName)}</strong>
        <small>${escapeHtml(train.serviceType || "Train")} - ${escapeHtml(train.status || "scheduled")} - ${delayMinutes ? `${delayMinutes} min delay` : "on time"}</small>
        <span class="status-pill">Platform ${train.currentPlatform || "pending"} ${train.currentPlatform ? changed : ""}</span>
        <small>${escapeHtml(train.message || "")}</small>
      </div>
    `;
  }).join("");
}

function renderTrips() {
  const cards = state.bootstrap?.tripCards ?? [];
  els.activeTripCount.textContent = `${cards.length} active`;
  els.tripList.innerHTML = cards.length ? cards.map((card) => {
    const selected = card.trip.id === state.selectedTripId;
    const severity = card.risk.severity;
    return `
      <button class="trip-button" type="button" data-trip-id="${card.trip.id}" aria-selected="${selected}">
        <span>
          <strong>${card.train.trainNumber} ${escapeHtml(card.train.name)}</strong>
          <small>${escapeHtml(card.trip.passengerName)} - ${card.booking ? `PNR ${card.booking.pnr}` : "Trip"}</small>
        </span>
        <span>
          <small>${card.boardingStation.code} to ${card.trip.destinationStationCode}</small>
          <span class="badge ${severity}">${severity.toUpperCase()} - Platform ${card.platformState.currentPlatform || "pending"}</span>
        </span>
      </button>
    `;
  }).join("") : `<div class="empty-card"><strong>No bookings yet</strong><small>Your confirmed train tickets will appear here.</small></div>`;
}

function renderEmptyState() {
  els.heroTrain.textContent = "No active journey";
  els.heroTitle.textContent = "Your confirmed booking will appear here";
  els.heroAction.textContent = "Book a train to start live platform-change alerts, walking margin, evidence, and PNR tracking.";
  els.currentPlatform.textContent = "--";
  els.platformConfidence.textContent = "Waiting for booking";
  els.riskBadge.textContent = "--";
  els.riskBadge.className = "badge";
  els.departureMetric.textContent = "--";
  els.walkMetric.textContent = "--";
  els.marginMetric.textContent = "--";
  els.confidenceBar.style.width = "0%";
  els.routeSummary.textContent = "--";
  els.stationMap.innerHTML = "";
  els.routeSteps.innerHTML = "";
  els.timeline.innerHTML = `<div class="empty-card"><strong>No evidence yet</strong><small>Evidence appears after a booking is confirmed.</small></div>`;
  els.stateVersion.textContent = "v--";
  els.alertCount.textContent = "0";
  els.alerts.innerHTML = `<div class="empty-card"><strong>No active alerts</strong><small>Alerts appear when a platform changes or boarding risk increases.</small></div>`;
  els.crowdPlatform.value = "";
  els.opsPlatform.value = "";
}

function renderHero(card) {
  const platform = card.platformState;
  const risk = card.risk;
  const changed = platform.previousPlatform && platform.previousPlatform !== platform.currentPlatform;

  els.heroTrain.textContent = card.booking?.pnr
    ? `${card.train.trainNumber} ${card.train.name} - PNR ${card.booking.pnr}`
    : `${card.train.trainNumber} ${card.train.name} - ${card.boardingStation.name}`;
  els.heroTitle.textContent = changed
    ? `Platform moved from ${platform.previousPlatform} to ${platform.currentPlatform}`
    : `${platform.currentPlatform ? `Platform ${platform.currentPlatform}` : "Platform pending"} for boarding`;
  els.heroAction.textContent = risk.nextAction;
  els.currentPlatform.textContent = platform.currentPlatform || "--";
  els.platformConfidence.textContent = `${platform.stateKind.replaceAll("_", " ")} - ${pct(platform.confidence)}`;
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
  const currentPlatform = card.platformState.currentPlatform;
  const activeAreaIds = new Set([
    card.trip.currentAreaId,
    ...(card.route.steps || []).map((step) => {
      const area = station.areas?.find((item) => item.name === step.to);
      return area?.id;
    }).filter(Boolean),
    currentPlatform ? `platform-${currentPlatform}` : null
  ]);

  if (!station?.areas?.length) {
    els.stationMap.innerHTML = `<div class="map-node active" style="left:50%;top:50%">Platform ${currentPlatform || "pending"}</div>`;
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
    return `<span class="${classes}" style="left:${area.x}%;top:${area.y}%">${escapeHtml(label)}</span>`;
  }).join("");

  els.stationMap.innerHTML = `<span class="route-line"></span>${nodes}`;
}

function renderRoute(card) {
  els.routeSteps.innerHTML = card.route.steps.map((step) => (
    `<li>${escapeHtml(step.from)} to ${escapeHtml(step.to)} - ${escapeHtml(step.mode)} - ${Math.ceil(step.expectedSeconds / 60)} min</li>`
  )).join("");
}

function renderTimeline(card) {
  els.timeline.innerHTML = card.timeline.length ? card.timeline.map((event) => `
    <div class="timeline-item">
      <strong>${escapeHtml(event.sourceName)} - Platform ${escapeHtml(event.platformNumber)}</strong>
      <small>${escapeHtml(event.assignmentKind)} - ${escapeHtml(event.sourceKind.replaceAll("_", " "))} - ${pct(event.sourceConfidence)} - ${formatAge(event.observedAt)}</small>
      <small>${escapeHtml(event.summary || "")}</small>
    </div>
  `).join("") : `<div class="empty-card"><strong>No evidence yet</strong><small>Waiting for platform signals.</small></div>`;
}

function renderAlerts(card) {
  els.alertCount.textContent = String(card.alerts.length);
  els.alerts.innerHTML = card.alerts.length ? card.alerts.map((alert) => `
    <div class="alert-item ${alert.severity}">
      <strong>${escapeHtml(alert.title)}</strong>
      ${alert.trainNumber ? `<small>Train ${alert.trainNumber} - ${alert.stationCode || card.boardingStation.code} - Platform ${alert.previousPlatform || card.platformState.plannedPlatform || "--"} to ${alert.currentPlatform || card.platformState.currentPlatform}</small>` : ""}
      <small>${escapeHtml(alert.body)}</small>
      <small>${formatAge(alert.createdAt)} - ${pct(alert.confidence)} confidence</small>
      ${alert.acknowledged ? "<small>Acknowledged</small>" : `<button class="alert-action" type="button" data-alert-id="${alert.id}">Acknowledge</button>`}
    </div>
  `).join("") : `<div class="empty-card"><strong>No active alerts</strong><small>Realtime stream is connected.</small></div>`;
}

function renderOps() {
  const metrics = state.bootstrap?.metrics ?? {
    activeTrips: 0,
    confirmedBookings: 0,
    acceptedCrowdReports: 0,
    openIncidents: 0
  };
  const incidents = state.bootstrap?.incidents ?? [];
  els.opsHealth.textContent = incidents.length ? `${incidents.length} open` : "Healthy";
  els.opsMetrics.innerHTML = `
    <div class="ops-metric"><strong>${metrics.activeTrips}</strong><small>Active trips</small></div>
    <div class="ops-metric"><strong>${metrics.confirmedBookings}</strong><small>Bookings</small></div>
    <div class="ops-metric"><strong>${metrics.acceptedCrowdReports}</strong><small>Crowd reports</small></div>
    <div class="ops-metric"><strong>${metrics.openIncidents}</strong><small>Data incidents</small></div>
  `;
}

function render() {
  if (!state.bootstrap) return;
  renderAuth();
  renderSelects();
  renderBookingOffers(state.currentOffers.length ? state.currentOffers : state.bootstrap.bookingOffers ?? []);
  renderTrips();
  renderLiveTrains();
  renderOps();

  const card = selectedCard();
  if (!card) {
    renderEmptyState();
    return;
  }
  renderHero(card);
  renderMap(card);
  renderRoute(card);
  renderTimeline(card);
  renderAlerts(card);
}

async function refreshBookingOffers() {
  const params = new URLSearchParams({
    from: resolveStationCode(els.boardingStationSelect.value),
    to: resolveStationCode(els.destinationStationSelect.value),
    classCode: els.bookingClassSelect.value,
    date: els.serviceDateInput.value
  });
  const result = await api(`/api/booking/search?${params}`);
  state.currentOffers = result.offers;
  state.selectedOfferId = result.offers[0]?.id ?? null;
  render();
}

function setupEvents() {
  els.signupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const result = await api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(els.signupForm)))
      });
      state.account = result.account;
      state.token = result.token;
      window.localStorage.setItem("railwayToken", result.token);
      render();
      showToast("Account created. You can book now.");
    } catch (error) {
      showToast(error.message);
    }
  });

  els.loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const result = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(els.loginForm)))
      });
      state.account = result.account;
      state.token = result.token;
      window.localStorage.setItem("railwayToken", result.token);
      render();
      showToast("Signed in.");
    } catch (error) {
      showToast(error.message);
    }
  });

  els.searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await refreshBookingOffers();
    } catch (error) {
      showToast(error.message);
    }
  });

  els.swapRouteButton.addEventListener("click", async () => {
    const from = els.boardingStationSelect.value;
    els.boardingStationSelect.value = els.destinationStationSelect.value;
    els.destinationStationSelect.value = from;
    try {
      await refreshBookingOffers();
    } catch (error) {
      showToast(error.message);
    }
  });

  els.liveTrainForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = new FormData(els.liveTrainForm).get("trainQuery") || "";
    try {
      const result = await api(`/api/trains/live?q=${encodeURIComponent(query)}`);
      state.liveTrains = result.trains;
      renderLiveTrains();
      showToast(result.trains.length ? "Live train status updated" : "No live train found");
    } catch (error) {
      showToast(error.message);
    }
  });

  els.bookingOffers.addEventListener("change", (event) => {
    if (event.target?.name !== "offerId") return;
    state.selectedOfferId = event.target.value;
    renderBookingOffers(state.currentOffers);
  });

  els.tripList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-trip-id]");
    if (!button) return;
    state.selectedTripId = button.dataset.tripId;
    render();
  });

  els.addTripForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const offer = selectedOffer();
    if (!offer) {
      showToast("Select a train before booking");
      return;
    }
    if (!state.account) {
      showToast("Create an account or sign in before booking");
      els.authPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const body = {
      ...Object.fromEntries(new FormData(els.addTripForm)),
      offerId: offer.id,
      boardingStationCode: resolveStationCode(els.boardingStationSelect.value),
      destinationStationCode: resolveStationCode(els.destinationStationSelect.value),
      classCode: els.bookingClassSelect.value,
      serviceDate: els.serviceDateInput.value,
      quota: els.quotaSelect.value
    };

    try {
      const result = await api("/api/bookings", {
        method: "POST",
        body: JSON.stringify(body)
      });
      state.selectedTripId = result.tripCard.trip.id;
      state.currentOffers = [];
      await refresh();
      els.pnrInput.value = result.booking.pnr;
      showToast(`Booking confirmed: PNR ${result.booking.pnr}`);
    } catch (error) {
      showToast(error.message);
    }
  });

  els.pnrForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const pnr = String(new FormData(els.pnrForm).get("pnr") || "").trim();
    if (!pnr) {
      showToast("Enter a PNR to track");
      return;
    }
    try {
      const result = await api(`/api/bookings/${encodeURIComponent(pnr)}`);
      await refresh();
      if (result.booking.tripId) {
        state.selectedTripId = result.booking.tripId;
        render();
      }
      els.pnrStatus.textContent = "Found";
      showToast(`Tracking PNR ${result.booking.pnr}`);
    } catch (error) {
      els.pnrStatus.textContent = "Not found";
      showToast(error.message);
    }
  });

  els.crowdForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const card = selectedCard();
    if (!card) {
      showToast("Book a ticket before submitting a crowd report");
      return;
    }
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
    if (!card) {
      showToast("Book a ticket before publishing a platform event");
      return;
    }
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

  els.resetDataButton.addEventListener("click", async () => {
    try {
      await api("/api/reset-data", { method: "POST" });
      state.selectedTripId = null;
      state.currentOffers = [];
      state.liveTrains = [];
      state.selectedOfferId = null;
      els.pnrStatus.textContent = "Ready";
      await refresh();
      showToast("Data reset");
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
  for (const eventName of ["platform.resolved", "alert.created", "crowd.reported", "trip.created", "booking.created", "data.reset"]) {
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
