function minutesFrom(now, minutes) {
  return new Date(now.getTime() + minutes * 60000).toISOString();
}

function isoDate(now) {
  return now.toISOString().slice(0, 10);
}

export function createSeedData(now = new Date()) {
  const stations = [
    {
      id: "station-ndls",
      code: "NDLS",
      name: "New Delhi",
      city: "Delhi",
      state: "Delhi",
      congestionScore: 0.64,
      platforms: ["4", "5", "8", "12", "16"],
      areas: [
        { id: "entrance-ajmeri", name: "Ajmeri Gate", kind: "entrance", x: 14, y: 64 },
        { id: "concourse-main", name: "Main Concourse", kind: "concourse", x: 30, y: 55 },
        { id: "display-board", name: "Central Display", kind: "display", x: 42, y: 35 },
        { id: "footbridge-main", name: "Main Footbridge", kind: "bridge", x: 58, y: 45 },
        { id: "lift-bank", name: "Lift Bank", kind: "lift", x: 54, y: 70 },
        { id: "platform-4", name: "Platform 4", kind: "platform", platformNumber: "4", x: 78, y: 22 },
        { id: "platform-5", name: "Platform 5", kind: "platform", platformNumber: "5", x: 82, y: 34 },
        { id: "platform-8", name: "Platform 8", kind: "platform", platformNumber: "8", x: 80, y: 54 },
        { id: "platform-12", name: "Platform 12", kind: "platform", platformNumber: "12", x: 78, y: 74 },
        { id: "helpdesk", name: "Helpdesk", kind: "service", x: 36, y: 77 }
      ],
      edges: [
        { from: "entrance-ajmeri", to: "concourse-main", mode: "walk", distanceMeters: 140, expectedSeconds: 150, accessible: true },
        { from: "concourse-main", to: "display-board", mode: "walk", distanceMeters: 45, expectedSeconds: 55, accessible: true },
        { from: "display-board", to: "footbridge-main", mode: "walk", distanceMeters: 90, expectedSeconds: 105, accessible: true },
        { from: "concourse-main", to: "lift-bank", mode: "walk", distanceMeters: 95, expectedSeconds: 115, accessible: true },
        { from: "lift-bank", to: "platform-8", mode: "lift", distanceMeters: 115, expectedSeconds: 170, accessible: true },
        { from: "lift-bank", to: "platform-12", mode: "lift", distanceMeters: 145, expectedSeconds: 210, accessible: true },
        { from: "footbridge-main", to: "platform-4", mode: "stairs", distanceMeters: 105, expectedSeconds: 150, accessible: false },
        { from: "footbridge-main", to: "platform-5", mode: "stairs", distanceMeters: 120, expectedSeconds: 160, accessible: false },
        { from: "footbridge-main", to: "platform-8", mode: "stairs", distanceMeters: 165, expectedSeconds: 215, accessible: false },
        { from: "footbridge-main", to: "platform-12", mode: "stairs", distanceMeters: 205, expectedSeconds: 275, accessible: false },
        { from: "concourse-main", to: "helpdesk", mode: "walk", distanceMeters: 70, expectedSeconds: 80, accessible: true }
      ]
    },
    {
      id: "station-csmt",
      code: "CSMT",
      name: "Mumbai CSMT",
      city: "Mumbai",
      state: "Maharashtra",
      congestionScore: 0.58,
      platforms: ["6", "8", "12", "15", "18"],
      areas: [],
      edges: []
    },
    {
      id: "station-hwh",
      code: "HWH",
      name: "Howrah Junction",
      city: "Howrah",
      state: "West Bengal",
      congestionScore: 0.61,
      platforms: ["7", "9", "14", "18", "21"],
      areas: [],
      edges: []
    },
    {
      id: "station-rkmp",
      code: "RKMP",
      name: "Rani Kamlapati",
      city: "Bhopal",
      state: "Madhya Pradesh",
      congestionScore: 0.35,
      platforms: ["1", "2", "3", "4", "5"],
      areas: [],
      edges: []
    }
  ];

  const trains = [
    {
      id: "train-12952",
      trainNumber: "12952",
      name: "Mumbai Rajdhani Express",
      serviceType: "Rajdhani",
      origin: "NDLS",
      destination: "CSMT"
    },
    {
      id: "train-12002",
      trainNumber: "12002",
      name: "Bhopal Shatabdi Express",
      serviceType: "Shatabdi",
      origin: "NDLS",
      destination: "RKMP"
    },
    {
      id: "train-12301",
      trainNumber: "12301",
      name: "Howrah Rajdhani Express",
      serviceType: "Rajdhani",
      origin: "HWH",
      destination: "NDLS"
    }
  ];

  const trainRuns = [
    {
      id: "run-12952-today",
      trainId: "train-12952",
      trainNumber: "12952",
      serviceDate: isoDate(now),
      status: "boarding",
      currentDelaySeconds: 180
    },
    {
      id: "run-12002-today",
      trainId: "train-12002",
      trainNumber: "12002",
      serviceDate: isoDate(now),
      status: "scheduled",
      currentDelaySeconds: 0
    },
    {
      id: "run-12301-today",
      trainId: "train-12301",
      trainNumber: "12301",
      serviceDate: isoDate(now),
      status: "scheduled",
      currentDelaySeconds: 600
    }
  ];

  const trainRunStops = [
    {
      id: "stop-12952-ndls",
      trainRunId: "run-12952-today",
      stationCode: "NDLS",
      stopSequence: 1,
      scheduledDeparture: minutesFrom(now, 25),
      predictedDeparture: minutesFrom(now, 28),
      plannedPlatform: "5",
      currentPlatform: "8",
      previousPlatform: "5",
      platformStateVersion: 2,
      confidence: 0.93,
      confidenceLevel: "critical",
      stateKind: "official_changed",
      newestObservedAt: minutesFrom(now, -2),
      events: [
        {
          id: "evt-planned-12952",
          sourceKind: "official_ntes",
          sourceName: "NTES planned board",
          platformNumber: "5",
          assignmentKind: "planned",
          sourceConfidence: 0.82,
          observedAt: minutesFrom(now, -38),
          createdAt: minutesFrom(now, -38),
          summary: "Initial planned platform published."
        },
        {
          id: "evt-station-12952",
          sourceKind: "official_station",
          sourceName: "NDLS station display",
          platformNumber: "8",
          assignmentKind: "changed",
          sourceConfidence: 0.97,
          observedAt: minutesFrom(now, -2),
          createdAt: minutesFrom(now, -2),
          summary: "Station display changed the train to Platform 8."
        },
        {
          id: "evt-crowd-12952",
          sourceKind: "crowd",
          sourceName: "Trusted passengers near footbridge",
          platformNumber: "8",
          assignmentKind: "confirmed",
          sourceConfidence: 0.69,
          observedAt: minutesFrom(now, -1),
          createdAt: minutesFrom(now, -1),
          summary: "Two accepted crowd reports confirm Platform 8."
        }
      ]
    },
    {
      id: "stop-12002-ndls",
      trainRunId: "run-12002-today",
      stationCode: "NDLS",
      stopSequence: 1,
      scheduledDeparture: minutesFrom(now, 58),
      predictedDeparture: minutesFrom(now, 58),
      plannedPlatform: "4",
      currentPlatform: "4",
      previousPlatform: null,
      platformStateVersion: 1,
      confidence: 0.81,
      confidenceLevel: "high",
      stateKind: "official_confirmed",
      newestObservedAt: minutesFrom(now, -5),
      events: [
        {
          id: "evt-station-12002",
          sourceKind: "official_station",
          sourceName: "NDLS station display",
          platformNumber: "4",
          assignmentKind: "confirmed",
          sourceConfidence: 0.94,
          observedAt: minutesFrom(now, -5),
          createdAt: minutesFrom(now, -5),
          summary: "Station display confirms Platform 4."
        }
      ]
    },
    {
      id: "stop-12301-hwh",
      trainRunId: "run-12301-today",
      stationCode: "HWH",
      stopSequence: 1,
      scheduledDeparture: minutesFrom(now, 92),
      predictedDeparture: minutesFrom(now, 102),
      plannedPlatform: "9",
      currentPlatform: "9",
      previousPlatform: null,
      platformStateVersion: 1,
      confidence: 0.78,
      confidenceLevel: "high",
      stateKind: "official_confirmed",
      newestObservedAt: minutesFrom(now, -8),
      events: [
        {
          id: "evt-station-12301",
          sourceKind: "official_station",
          sourceName: "HWH station display",
          platformNumber: "9",
          assignmentKind: "confirmed",
          sourceConfidence: 0.91,
          observedAt: minutesFrom(now, -8),
          createdAt: minutesFrom(now, -8),
          summary: "Station display confirms Platform 9."
        }
      ]
    }
  ];

  const users = [];
  const trips = [];
  const alerts = [];
  const bookings = [];
  const bookingInventory = [
    {
      id: "offer-12952-ndls-csmt-3a",
      trainNumber: "12952",
      serviceDate: isoDate(now),
      fromStationCode: "NDLS",
      toStationCode: "CSMT",
      classCode: "3A",
      quota: "GN",
      capacity: 48,
      availableSeats: 18,
      waitlist: 0,
      fare: 2310,
      currency: "INR",
      coachPrefix: "B",
      seatsPerCoach: 8,
      departureAt: minutesFrom(now, 28),
      arrivalAt: minutesFrom(now, 1030),
      journeyHours: 16.7
    },
    {
      id: "offer-12952-ndls-csmt-2a",
      trainNumber: "12952",
      serviceDate: isoDate(now),
      fromStationCode: "NDLS",
      toStationCode: "CSMT",
      classCode: "2A",
      quota: "GN",
      capacity: 32,
      availableSeats: 7,
      waitlist: 0,
      fare: 3425,
      currency: "INR",
      coachPrefix: "A",
      seatsPerCoach: 6,
      departureAt: minutesFrom(now, 28),
      arrivalAt: minutesFrom(now, 1030),
      journeyHours: 16.7
    },
    {
      id: "offer-12002-ndls-rkmp-cc",
      trainNumber: "12002",
      serviceDate: isoDate(now),
      fromStationCode: "NDLS",
      toStationCode: "RKMP",
      classCode: "CC",
      quota: "GN",
      capacity: 72,
      availableSeats: 24,
      waitlist: 0,
      fare: 1395,
      currency: "INR",
      coachPrefix: "C",
      seatsPerCoach: 12,
      departureAt: minutesFrom(now, 58),
      arrivalAt: minutesFrom(now, 545),
      journeyHours: 8.1
    },
    {
      id: "offer-12301-hwh-ndls-3a",
      trainNumber: "12301",
      serviceDate: isoDate(now),
      fromStationCode: "HWH",
      toStationCode: "NDLS",
      classCode: "3A",
      quota: "GN",
      capacity: 48,
      availableSeats: 5,
      waitlist: 0,
      fare: 2590,
      currency: "INR",
      coachPrefix: "B",
      seatsPerCoach: 8,
      departureAt: minutesFrom(now, 102),
      arrivalAt: minutesFrom(now, 1160),
      journeyHours: 17.6
    }
  ];

  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    stations,
    trains,
    trainRuns,
    trainRunStops,
    users,
    trips,
    bookings,
    bookingInventory,
    crowdReports: [],
    alerts,
    incidents: []
  };
}
