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
});

test("adding a journey immediately creates train-specific platform-change alert", async () => {
  await callApi("/api/reset-data", { method: "POST" });
  const result = await callApi("/api/trips", {
    method: "POST",
    body: {
      passengerName: "Passenger",
      trainNumber: "12952",
      boardingStationCode: "NDLS",
      destinationStationCode: "CSMT",
      coach: "S1",
      mobilityProfile: "luggage"
    }
  });

  assert.equal(result.statusCode, 201);
  assert.equal(result.payload.alerts.length, 1);
  assert.equal(result.payload.alerts[0].title, "12952: Platform 5 -> 8 at NDLS");
  assert.match(result.payload.alerts[0].body, /train 12952 Mumbai Rajdhani Express/);
  assert.match(result.payload.alerts[0].body, /Previous platform was 5/);
});
