export const SOURCE_AUTHORITY = Object.freeze({
  official_station: 0.98,
  official_railway_partner: 0.97,
  official_ntes: 0.88,
  operator: 0.86,
  gps: 0.7,
  crowd: 0.58,
  ai_prediction: 0.52,
  third_party: 0.42
});

const EVIDENCE_STRENGTH = Object.freeze({
  display_board_seen: 0.78,
  announcement_heard: 0.64,
  platform_seen: 0.6,
  train_arrived: 0.86,
  coach_position_seen: 0.48,
  contradiction: 0.52
});

const MOBILITY_MULTIPLIERS = Object.freeze({
  standard: 1,
  luggage: 1.22,
  senior: 1.32,
  wheelchair: 1.48,
  family: 1.38,
  emergency: 1.08
});

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function freshnessScore(observedAt, now = new Date()) {
  const ageSeconds = Math.max(0, (now.getTime() - new Date(observedAt).getTime()) / 1000);
  if (ageSeconds <= 45) return 1;
  if (ageSeconds <= 120) return 0.94;
  if (ageSeconds <= 300) return 0.82;
  if (ageSeconds <= 900) return 0.62;
  if (ageSeconds <= 1800) return 0.42;
  return 0.2;
}

export function confidenceLevel(score) {
  if (score >= 0.9) return "critical";
  if (score >= 0.75) return "high";
  if (score >= 0.55) return "medium";
  if (score >= 0.35) return "low";
  return "very_low";
}

export function confidenceLabel(score, stateKind = "resolved") {
  const level = confidenceLevel(score);
  if (stateKind === "conflict") return "Conflict detected";
  if (stateKind === "predicted") return "High-confidence prediction";
  if (level === "critical") return "Official / corroborated";
  if (level === "high") return "High confidence";
  if (level === "medium") return "Moderate confidence";
  if (level === "low") return "Low confidence";
  return "Very low confidence";
}

export function reconcilePlatform(candidates, options = {}) {
  const now = options.now ?? new Date();
  const plannedPlatform = options.plannedPlatform ?? null;
  const grouped = new Map();

  for (const candidate of candidates) {
    if (!candidate?.platformNumber) continue;
    const authority = SOURCE_AUTHORITY[candidate.sourceKind] ?? SOURCE_AUTHORITY.third_party;
    const freshness = freshnessScore(candidate.observedAt ?? candidate.createdAt ?? now, now);
    const sourceConfidence = clamp(candidate.sourceConfidence ?? authority, 0.05, 0.99);
    const corroborationBoost = candidate.assignmentKind === "confirmed" ? 0.06 : 0;
    const changeBoost = candidate.assignmentKind === "changed" ? 0.04 : 0;
    const predictionPenalty = candidate.sourceKind === "ai_prediction" ? -0.04 : 0;
    const score = clamp(authority * sourceConfidence * freshness + corroborationBoost + changeBoost + predictionPenalty, 0.01, 0.99);

    const bucket = grouped.get(candidate.platformNumber) ?? {
      platformNumber: candidate.platformNumber,
      scoreTotal: 0,
      authorityMax: 0,
      sources: [],
      newestObservedAt: candidate.observedAt ?? candidate.createdAt ?? now
    };

    bucket.scoreTotal += score;
    bucket.authorityMax = Math.max(bucket.authorityMax, authority);
    bucket.sources.push({
      sourceKind: candidate.sourceKind,
      sourceName: candidate.sourceName,
      sourceConfidence,
      observedAt: candidate.observedAt ?? candidate.createdAt ?? now,
      assignmentKind: candidate.assignmentKind
    });
    if (new Date(candidate.observedAt ?? candidate.createdAt ?? now) > new Date(bucket.newestObservedAt)) {
      bucket.newestObservedAt = candidate.observedAt ?? candidate.createdAt ?? now;
    }
    grouped.set(candidate.platformNumber, bucket);
  }

  if (!grouped.size) {
    return {
      platformNumber: plannedPlatform,
      confidence: plannedPlatform ? 0.34 : 0.1,
      confidenceLevel: plannedPlatform ? "low" : "very_low",
      stateKind: "scheduled",
      label: plannedPlatform ? "Scheduled platform" : "Platform pending",
      sources: [],
      conflict: false
    };
  }

  const ranked = [...grouped.values()].sort((a, b) => b.scoreTotal - a.scoreTotal);
  const winner = ranked[0];
  const runnerUp = ranked[1];
  const total = ranked.reduce((sum, item) => sum + item.scoreTotal, 0);
  const topShare = winner.scoreTotal / Math.max(total, 0.01);
  const authorityFloor = winner.authorityMax >= 0.95 ? 0.88 : winner.authorityMax >= 0.85 ? 0.76 : 0.42;
  const agreementBoost = Math.min(0.09, Math.max(0, winner.sources.length - 1) * 0.035);
  const conflict = Boolean(runnerUp && runnerUp.scoreTotal / Math.max(winner.scoreTotal, 0.01) > 0.68);
  let confidence = clamp(Math.max(authorityFloor, topShare * 0.88 + agreementBoost), 0.08, 0.99);
  let stateKind = "resolved";

  if (conflict) {
    confidence = clamp(confidence - 0.22, 0.08, 0.82);
    stateKind = "conflict";
  } else if (winner.sources.some((source) => source.sourceKind === "official_station" || source.sourceKind === "official_railway_partner")) {
    stateKind = winner.platformNumber !== plannedPlatform ? "official_changed" : "official_confirmed";
  } else if (winner.sources.some((source) => source.sourceKind === "crowd")) {
    stateKind = "crowd_confirmed";
  } else if (winner.sources.every((source) => source.sourceKind === "ai_prediction")) {
    stateKind = "predicted";
    confidence = Math.min(confidence, 0.82);
  }

  return {
    platformNumber: winner.platformNumber,
    confidence,
    confidenceLevel: confidenceLevel(confidence),
    stateKind,
    label: confidenceLabel(confidence, stateKind),
    sources: winner.sources,
    alternatives: ranked.slice(1).map((item) => ({
      platformNumber: item.platformNumber,
      support: clamp(item.scoreTotal / Math.max(total, 0.01), 0, 1)
    })),
    conflict,
    newestObservedAt: winner.newestObservedAt
  };
}

export function scoreCrowdReport(report, now = new Date()) {
  const evidenceStrength = EVIDENCE_STRENGTH[report.voteKind] ?? 0.4;
  const trust = clamp(report.userTrust ?? 0.2, 0.05, 0.98);
  const distance = Number.isFinite(report.distanceMeters) ? report.distanceMeters : 9999;
  const proximity =
    distance <= 90 ? 1 :
    distance <= 180 ? 0.85 :
    distance <= 450 ? 0.48 :
    0.12;
  const ageMinutes = Math.max(0, (now.getTime() - new Date(report.reportedAt ?? now).getTime()) / 60000);
  const recency = Math.max(0.28, Math.exp(-ageMinutes / 28));
  const independenceBonus = Math.min(0.14, Math.max(0, report.independentReports ?? 0) * 0.045);
  const mediaBonus = report.mediaProvided ? 0.08 : 0;
  const abusePenalty = clamp(report.abuseRisk ?? 0, 0, 0.5);
  const contradictionPenalty = clamp(report.contradictionRate ?? 0, 0, 0.45);

  const score = clamp(
    evidenceStrength * (0.36 + trust) * proximity * recency + independenceBonus + mediaBonus - abusePenalty - contradictionPenalty,
    0,
    0.98
  );

  return {
    trustWeight: score,
    accepted: score >= 0.34,
    label: score >= 0.72 ? "strong" : score >= 0.5 ? "useful" : score >= 0.34 ? "weak-but-usable" : "held-for-review"
  };
}

export function computeWalkingMinutes(route, mobilityProfile = "standard", congestionScore = 0) {
  const baseSeconds = route?.expectedSeconds ?? 420;
  const multiplier = MOBILITY_MULTIPLIERS[mobilityProfile] ?? MOBILITY_MULTIPLIERS.standard;
  const congestionMultiplier = 1 + clamp(congestionScore, 0, 1) * 0.38;
  return Math.ceil((baseSeconds * multiplier * congestionMultiplier) / 60);
}

export function computeTripRisk(input) {
  const now = input.now ?? new Date();
  const departureAt = new Date(input.departureAt);
  const minutesUntilDeparture = Math.max(0, Math.floor((departureAt.getTime() - now.getTime()) / 60000));
  const walkingMinutes = input.walkingMinutes ?? 7;
  const boardingBufferMinutes = input.emergencyMode ? 7 : 5;
  const marginMinutes = minutesUntilDeparture - walkingMinutes - boardingBufferMinutes;
  const platformChanged = Boolean(input.platformChanged);
  const confidence = clamp(input.confidence ?? 0.4, 0, 1);
  const stalePenalty = input.dataStale ? 0.18 : 0;
  const mobilityPenalty = ["senior", "wheelchair", "family", "luggage"].includes(input.mobilityProfile) ? 0.08 : 0;

  let score = 0.12;
  if (marginMinutes <= -2) score = 0.92;
  else if (marginMinutes <= 1) score = 0.78;
  else if (marginMinutes <= 4) score = 0.62;
  else if (marginMinutes <= 8) score = 0.38;

  if (platformChanged) score += 0.16;
  if (confidence < 0.55) score += 0.1;
  if (confidence >= 0.9 && platformChanged) score += 0.06;
  score = clamp(score + stalePenalty + mobilityPenalty, 0, 1);

  const severity =
    score >= 0.86 ? "critical" :
    score >= 0.66 ? "urgent" :
    score >= 0.4 ? "attention" :
    "calm";

  let nextAction = "Stay close to the departure board and keep this trip open.";
  if (severity === "critical") {
    nextAction = `Move now to Platform ${input.platformNumber}. Verify at the next display board on the way.`;
  } else if (severity === "urgent") {
    nextAction = `Start moving to Platform ${input.platformNumber}; your boarding margin is tight.`;
  } else if (severity === "attention") {
    nextAction = `Head toward Platform ${input.platformNumber} and recheck the board before the footbridge.`;
  } else if (confidence >= 0.75) {
    nextAction = `Proceed to Platform ${input.platformNumber} with normal boarding time.`;
  }

  return {
    score,
    severity,
    minutesUntilDeparture,
    walkingMinutes,
    marginMinutes,
    nextAction
  };
}

export function shouldCreateAlert({ risk, confidence, platformChanged, dataStale }) {
  if (!risk) return false;
  if (risk.severity === "critical" || risk.severity === "urgent") return true;
  if (platformChanged && confidence >= 0.55) return true;
  return Boolean(dataStale && risk.severity === "attention");
}
