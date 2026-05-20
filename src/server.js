import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { createSeedData } from "./data/seed.js";
import {
  computeTripRisk,
  computeWalkingMinutes,
  composePlatformNotification,
  confidenceLevel,
  reconcilePlatform,
  scoreCrowdReport,
  shouldCreateAlert
} from "./domain/intelligence.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = join(__dirname, "..");
const publicDir = join(rootDir, "public");

const state = createSeedData(new Date());
const clients = new Set();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function notFound(response) {
  sendJson(response, 404, { error: "not_found" });
}

function badRequest(response, message, details = {}) {
  sendJson(response, 400, { error: "bad_request", message, details });
}

async function readJson(request) {
  if (request.body !== undefined) {
    if (typeof request.body === "string") {
      return request.body ? JSON.parse(request.body) : {};
    }
    if (Buffer.isBuffer(request.body)) {
      const body = request.body.toString("utf8");
      return body ? JSON.parse(body) : {};
    }
    return request.body ?? {};
  }

  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) {
      throw new Error("Request body too large");
    }
  }
  return body ? JSON.parse(body) : {};
}

function publish(type, payload) {
  const message = `event: ${type}\ndata: ${JSON.stringify({ type, payload, at: new Date().toISOString() })}\n\n`;
  for (const client of clients) {
    client.write(message);
  }
}

function findStation(code) {
  return state.stations.find((station) => station.code === code);
}

function findTrain(trainNumber) {
  return state.trains.find((train) => train.trainNumber === trainNumber);
}

function findTrainRun(trainNumber) {
  return state.trainRuns.find((run) => run.trainNumber === trainNumber);
}

function findStop(trainNumber, stationCode) {
  const run = findTrainRun(trainNumber);
  if (!run) return null;
  return state.trainRunStops.find((stop) => stop.trainRunId === run.id && stop.stationCode === stationCode);
}

function getArea(station, areaId) {
  return station?.areas?.find((area) => area.id === areaId);
}

function getAreaName(station, areaId) {
  return getArea(station, areaId)?.name ?? areaId;
}

function getRoute(stationCode, fromAreaId, platformNumber, mobilityProfile = "standard") {
  const station = findStation(stationCode);
  if (!station?.areas?.length) {
    return {
      stationCode,
      fromAreaId,
      toAreaId: `platform-${platformNumber}`,
      expectedSeconds: 420,
      distanceMeters: 480,
      accessible: true,
      steps: [
        { from: "station entrance", to: `Platform ${platformNumber}`, mode: "walk", expectedSeconds: 420 }
      ]
    };
  }

  const toAreaId = `platform-${platformNumber}`;
  const accessibleOnly = mobilityProfile === "wheelchair";
  const adjacency = new Map(station.areas.map((area) => [area.id, []]));
  for (const edge of station.edges) {
    if (accessibleOnly && !edge.accessible) continue;
    adjacency.get(edge.from)?.push(edge);
    adjacency.get(edge.to)?.push({
      ...edge,
      from: edge.to,
      to: edge.from
    });
  }

  const distances = new Map(station.areas.map((area) => [area.id, Infinity]));
  const previous = new Map();
  distances.set(fromAreaId, 0);
  const queue = new Set(station.areas.map((area) => area.id));

  while (queue.size) {
    const current = [...queue].sort((a, b) => distances.get(a) - distances.get(b))[0];
    queue.delete(current);
    if (current === toAreaId || distances.get(current) === Infinity) break;
    for (const edge of adjacency.get(current) ?? []) {
      const nextDistance = distances.get(current) + edge.expectedSeconds;
      if (nextDistance < distances.get(edge.to)) {
        distances.set(edge.to, nextDistance);
        previous.set(edge.to, edge);
      }
    }
  }

  const steps = [];
  let cursor = toAreaId;
  while (previous.has(cursor)) {
    const edge = previous.get(cursor);
    steps.unshift({
      from: getAreaName(station, edge.from),
      to: getAreaName(station, edge.to),
      mode: edge.mode,
      distanceMeters: edge.distanceMeters,
      expectedSeconds: edge.expectedSeconds,
      accessible: edge.accessible
    });
    cursor = edge.from;
  }

  if (!steps.length) {
    return getRoute(stationCode, fromAreaId, platformNumber, "standard");
  }

  return {
    stationCode,
    fromAreaId,
    toAreaId,
    expectedSeconds: steps.reduce((sum, step) => sum + step.expectedSeconds, 0),
    distanceMeters: steps.reduce((sum, step) => sum + (step.distanceMeters ?? 0), 0),
    accessible: steps.every((step) => step.accessible),
    steps
  };
}

function resolveStop(stop) {
  const result = reconcilePlatform(stop.events, {
    plannedPlatform: stop.plannedPlatform,
    now: new Date()
  });
  const priorPlatform = stop.currentPlatform;
  const platformChanged = result.platformNumber && result.platformNumber !== priorPlatform;

  stop.previousPlatform = platformChanged ? priorPlatform : stop.previousPlatform;
  stop.currentPlatform = result.platformNumber;
  stop.confidence = result.confidence;
  stop.confidenceLevel = result.confidenceLevel;
  stop.stateKind = result.stateKind;
  stop.newestObservedAt = result.newestObservedAt;
  stop.platformStateVersion += 1;
  stop.alternatives = result.alternatives ?? [];
  stop.conflict = result.conflict;

  if (result.conflict) {
    const existingOpen = state.incidents.find((incident) => (
      incident.trainRunStopId === stop.id &&
      incident.kind === "platform_conflict" &&
      incident.status === "open"
    ));
    if (!existingOpen) {
      state.incidents.unshift({
        id: randomUUID(),
        trainRunStopId: stop.id,
        stationCode: stop.stationCode,
        trainNumber: state.trainRuns.find((run) => run.id === stop.trainRunId)?.trainNumber,
        kind: "platform_conflict",
        severity: "high",
        summary: `Conflicting platform evidence for Platform ${result.platformNumber}.`,
        evidence: result.alternatives,
        status: "open",
        detectedAt: new Date().toISOString()
      });
    }
  }

  return { ...result, platformChanged };
}

function buildAlert({ trip, stop, risk, route, kind = "platform_change" }) {
  const idempotencyKey = `${trip.id}:${stop.platformStateVersion}:${kind}`;
  const existing = state.alerts.find((alert) => alert.idempotencyKey === idempotencyKey);
  if (existing) return existing;

  const trainRun = state.trainRuns.find((run) => run.id === stop.trainRunId);
  const train = state.trains.find((item) => item.id === trainRun?.trainId);
  const station = findStation(stop.stationCode);
  const notification = composePlatformNotification({
    passengerName: trip.passengerName,
    trainNumber: trainRun?.trainNumber ?? trip.trainNumber,
    trainName: train?.name,
    stationCode: stop.stationCode,
    stationName: station?.name,
    previousPlatform: stop.previousPlatform,
    plannedPlatform: stop.plannedPlatform,
    currentPlatform: stop.currentPlatform,
    confidence: stop.confidence,
    stateKind: stop.stateKind,
    risk,
    route
  });

  const alert = {
    id: randomUUID(),
    tripId: trip.id,
    trainRunStopId: stop.id,
    trainNumber: trainRun?.trainNumber ?? trip.trainNumber,
    trainName: train?.name,
    passengerName: trip.passengerName,
    stationCode: stop.stationCode,
    previousPlatform: notification.previousPlatform,
    currentPlatform: notification.currentPlatform,
    platformStateVersion: stop.platformStateVersion,
    kind,
    severity: risk.severity,
    title: notification.title,
    body: notification.body,
    shortBody: notification.shortBody,
    confidence: stop.confidence,
    idempotencyKey,
    acknowledged: false,
    createdAt: new Date().toISOString()
  };
  state.alerts.unshift(alert);
  publish("alert.created", alert);
  return alert;
}

function refreshTripAlerts(stop) {
  const run = state.trainRuns.find((item) => item.id === stop.trainRunId);
  const affectedTrips = state.trips.filter((trip) => (
    trip.trainRunId === stop.trainRunId &&
    trip.boardingStationCode === stop.stationCode &&
    trip.status === "active"
  ));

  for (const trip of affectedTrips) {
    const route = getRoute(trip.boardingStationCode, trip.currentAreaId, stop.currentPlatform, trip.mobilityProfile);
    const station = findStation(trip.boardingStationCode);
    const walkingMinutes = computeWalkingMinutes(route, trip.mobilityProfile, station?.congestionScore ?? 0);
    const risk = computeTripRisk({
      departureAt: stop.predictedDeparture ?? stop.scheduledDeparture,
      walkingMinutes,
      platformChanged: stop.previousPlatform && stop.previousPlatform !== stop.currentPlatform,
      confidence: stop.confidence,
      platformNumber: stop.currentPlatform,
      mobilityProfile: trip.mobilityProfile,
      emergencyMode: trip.trackingMode === "emergency",
      now: new Date()
    });

    if (shouldCreateAlert({
      risk,
      confidence: stop.confidence,
      platformChanged: stop.previousPlatform && stop.previousPlatform !== stop.currentPlatform,
      dataStale: false
    })) {
      buildAlert({ trip, stop, risk, route });
    }
  }

  publish("platform.resolved", {
    trainNumber: run?.trainNumber,
    stationCode: stop.stationCode,
    platformNumber: stop.currentPlatform,
    confidence: stop.confidence,
    stateKind: stop.stateKind,
    platformStateVersion: stop.platformStateVersion
  });
}

function buildTripCard(trip) {
  const trainRun = state.trainRuns.find((run) => run.id === trip.trainRunId);
  const train = state.trains.find((item) => item.id === trainRun?.trainId);
  const stop = state.trainRunStops.find((item) => (
    item.trainRunId === trip.trainRunId &&
    item.stationCode === trip.boardingStationCode
  ));
  const station = findStation(trip.boardingStationCode);
  const route = getRoute(trip.boardingStationCode, trip.currentAreaId, stop.currentPlatform, trip.mobilityProfile);
  const walkingMinutes = computeWalkingMinutes(route, trip.mobilityProfile, station?.congestionScore ?? 0);
  const risk = computeTripRisk({
    departureAt: stop.predictedDeparture ?? stop.scheduledDeparture,
    walkingMinutes,
    platformChanged: stop.previousPlatform && stop.previousPlatform !== stop.currentPlatform,
    confidence: stop.confidence,
    platformNumber: stop.currentPlatform,
    mobilityProfile: trip.mobilityProfile,
    emergencyMode: trip.trackingMode === "emergency",
    now: new Date()
  });

  return {
    trip,
    train,
    trainRun,
    boardingStation: station,
    destinationStation: findStation(trip.destinationStationCode),
    platformState: {
      trainRunStopId: stop.id,
      plannedPlatform: stop.plannedPlatform,
      currentPlatform: stop.currentPlatform,
      previousPlatform: stop.previousPlatform,
      confidence: stop.confidence,
      confidenceLevel: stop.confidenceLevel ?? confidenceLevel(stop.confidence),
      stateKind: stop.stateKind,
      newestObservedAt: stop.newestObservedAt,
      platformStateVersion: stop.platformStateVersion,
      alternatives: stop.alternatives ?? [],
      conflict: Boolean(stop.conflict)
    },
    route,
    risk,
    alerts: state.alerts.filter((alert) => alert.tripId === trip.id).slice(0, 6),
    timeline: stop.events.slice().sort((a, b) => new Date(b.observedAt) - new Date(a.observedAt)),
    incidents: state.incidents.filter((incident) => (
      incident.trainRunStopId === stop.id &&
      incident.status === "open"
    ))
  };
}

function buildBootstrap() {
  const tripCards = state.trips.filter((trip) => trip.status === "active").map(buildTripCard);
  return {
    generatedAt: new Date().toISOString(),
    stations: state.stations,
    trains: state.trains,
    tripCards,
    alerts: state.alerts.slice(0, 12),
    incidents: state.incidents.slice(0, 8),
    metrics: {
      activeTrips: state.trips.filter((trip) => trip.status === "active").length,
      openIncidents: state.incidents.filter((incident) => incident.status === "open").length,
      acceptedCrowdReports: state.crowdReports.filter((report) => report.accepted).length,
      criticalAlerts: state.alerts.filter((alert) => alert.severity === "critical").length
    }
  };
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const safePath = normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    notFound(response);
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(file);
  } catch {
    notFound(response);
  }
}

export async function handleApi(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const method = request.method ?? "GET";

  if (method === "GET" && requestUrl.pathname === "/api/health") {
    const uptimeSeconds = typeof process !== "undefined" && process.uptime ? Math.round(process.uptime()) : null;
    sendJson(response, 200, { ok: true, uptimeSeconds });
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/bootstrap") {
    sendJson(response, 200, buildBootstrap());
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/reset-demo") {
    Object.assign(state, createSeedData(new Date()));
    const payload = buildBootstrap();
    publish("demo.reset", payload);
    sendJson(response, 200, payload);
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/trips") {
    const body = await readJson(request);
    const train = findTrain(body.trainNumber);
    const run = findTrainRun(body.trainNumber);
    const boardingStation = findStation(body.boardingStationCode);
    const destinationStation = findStation(body.destinationStationCode);
    if (!train || !run || !boardingStation) {
      badRequest(response, "Unknown train or station.");
      return;
    }

    const userId = randomUUID();
    state.users.push({
      id: userId,
      displayName: body.passengerName || "Passenger",
      preferredLanguage: "en",
      trustScore: 0.42,
      emergencyModeEnabled: body.trackingMode === "emergency"
    });

    const trip = {
      id: randomUUID(),
      userId,
      passengerName: body.passengerName || "Passenger",
      trainRunId: run.id,
      trainNumber: train.trainNumber,
      boardingStationCode: boardingStation.code,
      destinationStationCode: destinationStation?.code ?? train.destination,
      coach: body.coach || "",
      berth: body.berth || "",
      familyGroupName: body.familyGroupName || "",
      mobilityProfile: body.mobilityProfile || "standard",
      currentAreaId: body.currentAreaId || boardingStation.areas?.[0]?.id || "station entrance",
      trackingMode: body.trackingMode || "normal",
      status: "active",
      createdAt: new Date().toISOString()
    };
    state.trips.unshift(trip);
    const payload = buildTripCard(trip);
    publish("trip.created", payload);
    sendJson(response, 201, payload);
    return;
  }

  if (method === "POST" && requestUrl.pathname.startsWith("/api/trips/") && requestUrl.pathname.endsWith("/location")) {
    const tripId = requestUrl.pathname.split("/")[3];
    const body = await readJson(request);
    const trip = state.trips.find((item) => item.id === tripId);
    if (!trip) {
      notFound(response);
      return;
    }
    trip.currentAreaId = body.currentAreaId || trip.currentAreaId;
    trip.mobilityProfile = body.mobilityProfile || trip.mobilityProfile;
    trip.trackingMode = body.trackingMode || trip.trackingMode;
    const payload = buildTripCard(trip);
    publish("trip.location_updated", payload);
    sendJson(response, 200, payload);
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/platform-events") {
    const body = await readJson(request);
    const stop = findStop(body.trainNumber, body.stationCode);
    if (!stop) {
      badRequest(response, "Unknown train stop.");
      return;
    }

    const event = {
      id: randomUUID(),
      sourceKind: body.sourceKind || "operator",
      sourceName: body.sourceName || "Ops console",
      platformNumber: String(body.platformNumber || "").trim(),
      assignmentKind: body.assignmentKind || "changed",
      sourceConfidence: Number(body.sourceConfidence ?? 0.86),
      observedAt: body.observedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      summary: body.summary || `${body.sourceKind || "operator"} reported Platform ${body.platformNumber}.`
    };
    if (!event.platformNumber) {
      badRequest(response, "Platform number is required.");
      return;
    }

    stop.events.push(event);
    const resolution = resolveStop(stop);
    refreshTripAlerts(stop);
    sendJson(response, 201, { event, resolution, stop });
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/crowd-reports") {
    const body = await readJson(request);
    const trip = state.trips.find((item) => item.id === body.tripId) ?? state.trips[0];
    const user = state.users.find((item) => item.id === trip?.userId);
    const stop = findStop(body.trainNumber || trip?.trainNumber, body.stationCode || trip?.boardingStationCode);
    if (!trip || !stop) {
      badRequest(response, "Trip or train stop not found.");
      return;
    }

    const independentReports = state.crowdReports.filter((report) => (
      report.trainRunStopId === stop.id &&
      report.reportedPlatform === String(body.reportedPlatform) &&
      report.accepted
    )).length;

    const scoring = scoreCrowdReport({
      voteKind: body.voteKind || "display_board_seen",
      userTrust: user?.trustScore ?? 0.2,
      distanceMeters: Number(body.distanceMeters ?? 120),
      mediaProvided: Boolean(body.mediaProvided),
      independentReports,
      reportedAt: new Date().toISOString()
    });

    const report = {
      id: randomUUID(),
      userId: user?.id,
      tripId: trip.id,
      trainRunStopId: stop.id,
      stationCode: stop.stationCode,
      trainNumber: trip.trainNumber,
      voteKind: body.voteKind || "display_board_seen",
      reportedPlatform: String(body.reportedPlatform || stop.currentPlatform),
      trustWeight: scoring.trustWeight,
      accepted: scoring.accepted,
      label: scoring.label,
      mediaProvided: Boolean(body.mediaProvided),
      createdAt: new Date().toISOString()
    };
    state.crowdReports.unshift(report);

    if (report.accepted) {
      stop.events.push({
        id: randomUUID(),
        sourceKind: "crowd",
        sourceName: `${trip.passengerName || "Passenger"} report`,
        platformNumber: report.reportedPlatform,
        assignmentKind: report.reportedPlatform === stop.currentPlatform ? "confirmed" : "changed",
        sourceConfidence: report.trustWeight,
        observedAt: report.createdAt,
        createdAt: report.createdAt,
        summary: `${report.voteKind.replaceAll("_", " ")} for Platform ${report.reportedPlatform}.`
      });
      resolveStop(stop);
      refreshTripAlerts(stop);
    }

    publish("crowd.reported", report);
    sendJson(response, 201, { report, accepted: report.accepted, tripCard: buildTripCard(trip) });
    return;
  }

  if (method === "POST" && requestUrl.pathname.startsWith("/api/alerts/") && requestUrl.pathname.endsWith("/ack")) {
    const alertId = requestUrl.pathname.split("/")[3];
    const alert = state.alerts.find((item) => item.id === alertId);
    if (!alert) {
      notFound(response);
      return;
    }
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    publish("alert.acknowledged", alert);
    sendJson(response, 200, alert);
    return;
  }

  if (method === "GET" && requestUrl.pathname.startsWith("/api/stations/") && requestUrl.pathname.endsWith("/route")) {
    const stationCode = requestUrl.pathname.split("/")[3];
    const route = getRoute(
      stationCode,
      requestUrl.searchParams.get("from") || "entrance-ajmeri",
      requestUrl.searchParams.get("toPlatform") || "8",
      requestUrl.searchParams.get("mobility") || "standard"
    );
    sendJson(response, 200, route);
    return;
  }

  notFound(response);
}

const server = createServer(async (request, response) => {
  try {
    if (request.url === "/events") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      });
      response.write(`event: ready\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
      clients.add(response);
      request.on("close", () => clients.delete(response));
      return;
    }

    if (request.url?.startsWith("/api/")) {
      await handleApi(request, response);
      return;
    }

    await serveStatic(request, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "internal_error", message: error.message });
  }
});

const heartbeatTimer = setInterval(() => {
  for (const client of clients) {
    client.write(`event: heartbeat\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
  }
}, 15000);

heartbeatTimer.unref?.();

export function startServer(options = {}) {
  const port = Number(options.port ?? 4173);
  const logger = options.logger ?? console;

  if (typeof process !== "undefined") {
    process.stdout?.on?.("error", () => {});
    process.stderr?.on?.("error", () => {});
  }

  if (server.listening) return server;

  server.listen(port, () => {
    try {
      logger.log?.(`Railway Intelligence Platform running at http://127.0.0.1:${port}`);
    } catch {
      // Detached Windows launches can have closed console handles.
    }
  });

  return server;
}

export { server, state };

if (
  typeof process !== "undefined" &&
  process.argv?.[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startServer({ port: Number(process.env?.PORT ?? 4173) });
}
