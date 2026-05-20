import test from "node:test";
import assert from "node:assert/strict";
import {
  confidenceLevel,
  computeTripRisk,
  reconcilePlatform,
  scoreCrowdReport
} from "../src/domain/intelligence.js";

test("confidence levels match alert policy buckets", () => {
  assert.equal(confidenceLevel(0.91), "critical");
  assert.equal(confidenceLevel(0.76), "high");
  assert.equal(confidenceLevel(0.56), "medium");
  assert.equal(confidenceLevel(0.36), "low");
  assert.equal(confidenceLevel(0.12), "very_low");
});

test("official station evidence beats older crowd contradiction", () => {
  const now = new Date("2026-05-20T10:00:00.000Z");
  const result = reconcilePlatform([
    {
      sourceKind: "crowd",
      sourceName: "Passenger report",
      platformNumber: "5",
      assignmentKind: "changed",
      sourceConfidence: 0.62,
      observedAt: "2026-05-20T09:45:00.000Z"
    },
    {
      sourceKind: "official_station",
      sourceName: "Station display",
      platformNumber: "8",
      assignmentKind: "changed",
      sourceConfidence: 0.97,
      observedAt: "2026-05-20T09:59:00.000Z"
    }
  ], { plannedPlatform: "5", now });

  assert.equal(result.platformNumber, "8");
  assert.equal(result.stateKind, "official_changed");
  assert.ok(result.confidence >= 0.88);
});

test("trip risk becomes critical when walking margin is gone", () => {
  const now = new Date("2026-05-20T10:00:00.000Z");
  const risk = computeTripRisk({
    now,
    departureAt: "2026-05-20T10:06:00.000Z",
    walkingMinutes: 8,
    platformChanged: true,
    confidence: 0.93,
    platformNumber: "8",
    mobilityProfile: "luggage"
  });

  assert.equal(risk.severity, "critical");
  assert.ok(risk.score > 0.85);
});

test("crowd report scoring accepts fresh nearby display-board evidence", () => {
  const now = new Date("2026-05-20T10:00:00.000Z");
  const result = scoreCrowdReport({
    voteKind: "display_board_seen",
    userTrust: 0.66,
    distanceMeters: 80,
    mediaProvided: true,
    reportedAt: "2026-05-20T09:59:00.000Z"
  }, now);

  assert.equal(result.accepted, true);
  assert.ok(result.trustWeight >= 0.6);
});
