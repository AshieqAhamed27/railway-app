import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/index.js";

async function callApi(path, { method = "GET", body, query = {} } = {}) {
  let statusCode = 0;
  let payload = null;
  const request = {
    url: path,
    headers: { host: "localhost" },
    method,
    body,
    query
  };
  const response = {
    writeHead(code) {
      statusCode = code;
    },
    end(rawBody) {
      payload = rawBody ? JSON.parse(rawBody) : null;
    }
  };

  await handler(request, response);
  return { statusCode, payload };
}

test("bootstrap starts without passenger demo values", async () => {
  await callApi("/api/reset-data", { method: "POST" });
  const result = await callApi("/api/bootstrap");

  assert.equal(result.statusCode, 200);
  assert.equal(result.payload.tripCards.length, 0);
  assert.equal(result.payload.alerts.length, 0);
  assert.equal(result.payload.metrics.activeTrips, 0);
  assert.equal(result.payload.metrics.confirmedBookings, 0);
});

test("search returns bookable train offers", async () => {
  await callApi("/api/reset-data", { method: "POST" });
  const result = await callApi("/api/booking/search?from=NDLS&to=MMCT&classCode=3A");

  assert.equal(result.statusCode, 200);
  assert.equal(result.payload.offers.length, 1);
  assert.equal(result.payload.offers[0].trainNumber, "12952");
  assert.equal(result.payload.offers[0].status, "AVAILABLE");
});

test("search covers long-distance India corridors", async () => {
  await callApi("/api/reset-data", { method: "POST" });
  const result = await callApi("/api/booking/search?from=NDLS&to=MAS&classCode=3A");

  assert.equal(result.statusCode, 200);
  assert.equal(result.payload.offers.length, 1);
  assert.equal(result.payload.offers[0].trainNumber, "12616");
  assert.equal(result.payload.offers[0].toStationCode, "MAS");
});

test("station suggestions cover national station search", async () => {
  await callApi("/api/reset-data", { method: "POST" });
  const result = await callApi("/api/stations/search?q=varanasi");

  assert.equal(result.statusCode, 200);
  assert.ok(result.payload.stations.some((station) => station.code === "BSB"));
});

test("live train tracking returns platform and delay metadata", async () => {
  await callApi("/api/reset-data", { method: "POST" });
  const result = await callApi("/api/trains/12952/live");

  assert.equal(result.statusCode, 200);
  assert.equal(result.payload.train.trainNumber, "12952");
  assert.equal(result.payload.train.currentPlatform, "8");
  assert.equal(result.payload.train.platformChanged, true);
});

test("passenger account signup creates an authenticated session", async () => {
  await callApi("/api/reset-data", { method: "POST" });
  const result = await callApi("/api/auth/signup", {
    method: "POST",
    body: {
      name: "Passenger",
      email: "passenger@example.com",
      mobile: "9999999999",
      password: "secret1"
    }
  });

  assert.equal(result.statusCode, 201);
  assert.equal(result.payload.account.email, "passenger@example.com");
  assert.match(result.payload.token, /^[0-9a-f-]+$/);
});

test("booking creates pnr, ticket, active trip, and platform-change alert", async () => {
  await callApi("/api/reset-data", { method: "POST" });
  const result = await callApi("/api/bookings", {
    method: "POST",
    body: {
      passengerName: "Passenger",
      age: 30,
      gender: "not_specified",
      boardingStationCode: "NDLS",
      destinationStationCode: "MMCT",
      classCode: "3A",
      mobilityProfile: "luggage"
    }
  });

  assert.equal(result.statusCode, 201);
  assert.match(result.payload.booking.pnr, /^\d{10}$/);
  assert.equal(result.payload.booking.status, "CONFIRMED");
  assert.equal(result.payload.tripCard.alerts.length, 1);
  assert.equal(result.payload.tripCard.alerts[0].title, "12952: Platform 5 -> 8 at NDLS");
  assert.match(result.payload.tripCard.alerts[0].body, /train 12952 Mumbai Central Tejas Rajdhani Express/);
  assert.match(result.payload.tripCard.alerts[0].body, /Previous platform was 5/);

  const lookup = await callApi(`/api/bookings/${result.payload.booking.pnr}`);
  assert.equal(lookup.statusCode, 200);
  assert.equal(lookup.payload.booking.pnr, result.payload.booking.pnr);
});

test("booking selected offer creates the requested train ticket", async () => {
  await callApi("/api/reset-data", { method: "POST" });
  const result = await callApi("/api/bookings", {
    method: "POST",
    body: {
      offerId: "offer-12616-ndls-mas-sl",
      passengerName: "Passenger",
      age: 30,
      gender: "not_specified",
      boardingStationCode: "NDLS",
      destinationStationCode: "MAS",
      classCode: "SL",
      mobilityProfile: "standard"
    }
  });

  assert.equal(result.statusCode, 201);
  assert.equal(result.payload.booking.trainNumber, "12616");
  assert.equal(result.payload.booking.classCode, "SL");
  assert.equal(result.payload.booking.toStationCode, "MAS");
  assert.equal(result.payload.tripCard.platformState.currentPlatform, "16");
});
