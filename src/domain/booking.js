const CLASS_LABELS = Object.freeze({
  "1A": "AC First Class",
  "2A": "AC 2 Tier",
  "3A": "AC 3 Tier",
  SL: "Sleeper",
  CC: "AC Chair Car"
});

const BERTH_SEQUENCE = ["LB", "MB", "UB", "SL", "SU"];

export function classLabel(classCode) {
  return CLASS_LABELS[classCode] ?? classCode;
}

export function createPnr(seed = "") {
  const digits = `${Date.now()}${seed.replace(/\D/g, "")}`.slice(-10);
  return digits.padStart(10, "7");
}

export function normalizePassenger(input = {}) {
  return {
    name: String(input.passengerName || input.name || "Passenger").trim() || "Passenger",
    age: Math.max(1, Math.min(120, Number(input.age || 30))),
    gender: String(input.gender || "not_specified"),
    mobile: String(input.mobile || "").trim(),
    email: String(input.email || "").trim(),
    berthPreference: String(input.berthPreference || "no_preference"),
    mobilityProfile: String(input.mobilityProfile || "standard")
  };
}

export function searchBookingOffers({ state, from, to, serviceDate, classCode }) {
  const fromCode = String(from || "").toUpperCase();
  const toCode = String(to || "").toUpperCase();
  const requestedClass = classCode ? String(classCode).toUpperCase() : null;

  return state.bookingInventory
    .filter((item) => (
      item.fromStationCode === fromCode &&
      item.toStationCode === toCode &&
      (!serviceDate || item.serviceDate === serviceDate) &&
      (!requestedClass || item.classCode === requestedClass)
    ))
    .map((item) => {
      const train = state.trains.find((candidate) => candidate.trainNumber === item.trainNumber);
      const run = state.trainRuns.find((candidate) => candidate.trainNumber === item.trainNumber);
      const stop = state.trainRunStops.find((candidate) => (
        candidate.trainRunId === run?.id &&
        candidate.stationCode === item.fromStationCode
      ));
      return {
        id: item.id,
        trainNumber: item.trainNumber,
        trainName: train?.name,
        serviceType: train?.serviceType,
        serviceDate: item.serviceDate,
        fromStationCode: item.fromStationCode,
        toStationCode: item.toStationCode,
        classCode: item.classCode,
        classLabel: classLabel(item.classCode),
        quota: item.quota,
        availableSeats: item.availableSeats,
        waitlist: item.waitlist,
        fare: item.fare,
        currency: item.currency,
        departureAt: item.departureAt,
        arrivalAt: item.arrivalAt,
        journeyHours: item.journeyHours,
        status: item.availableSeats > 0 ? "AVAILABLE" : `WL ${item.waitlist}`,
        trainRunId: run?.id,
        platformNumber: stop?.currentPlatform ?? null,
        plannedPlatform: stop?.plannedPlatform ?? null,
        platformChanged: Boolean(stop?.previousPlatform && stop.previousPlatform !== stop.currentPlatform),
        delaySeconds: run?.currentDelaySeconds ?? 0,
        platformConfidence: stop?.confidence ?? null
      };
    })
    .sort((a, b) => new Date(a.departureAt) - new Date(b.departureAt));
}

export function reserveSeat({ state, offerId, passenger }) {
  const inventory = state.bookingInventory.find((item) => item.id === offerId);
  if (!inventory) {
    return { ok: false, reason: "Selected booking offer is no longer available." };
  }
  if (inventory.availableSeats <= 0) {
    return { ok: false, reason: `No confirmed seats left. Current status is WL ${inventory.waitlist}.` };
  }

  const bookedIndex = inventory.capacity - inventory.availableSeats + 1;
  const coach = `${inventory.coachPrefix}${Math.ceil(bookedIndex / inventory.seatsPerCoach)}`;
  const seatNumber = ((bookedIndex - 1) % inventory.seatsPerCoach) + 1;
  const berth = passenger.berthPreference !== "no_preference"
    ? passenger.berthPreference.toUpperCase()
    : BERTH_SEQUENCE[(bookedIndex - 1) % BERTH_SEQUENCE.length];

  inventory.availableSeats -= 1;
  return {
    ok: true,
    inventory,
    seat: {
      coach,
      seatNumber,
      berth
    }
  };
}

export function buildFareBreakup(fare) {
  const baseFare = Math.round(fare * 0.82);
  const reservationCharge = Math.round(fare * 0.04);
  const safetyAndServiceFee = Math.round(fare * 0.06);
  const taxes = fare - baseFare - reservationCharge - safetyAndServiceFee;
  return {
    baseFare,
    reservationCharge,
    safetyAndServiceFee,
    taxes,
    total: fare
  };
}
