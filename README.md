# India Railway Intelligence Platform

Mission: eliminate platform confusion and missed trains caused by last-minute platform changes.

This repository now includes a runnable full-stack pilot application plus the original production architecture pack. The app focuses on the highest-value passenger workflow: live platform state, confidence/provenance, station walking risk, crowd confirmation, alerting, and an operator input surface.

## Current Product Flow

- Search bookable train inventory by route, date, and travel class.
- Confirm a booking with passenger/contact details.
- Receive a PNR-style booking reference, fare breakup, coach, seat, and berth assignment.
- Automatically start live platform monitoring for the booked passenger.
- Show train-specific platform-change alerts such as `12952: Platform 5 -> 8 at NDLS`.

This is a pilot booking engine with in-memory inventory. Real Indian Railways ticket issuance would require official railway/IRCTC integration, compliance review, and payment settlement.

## Run The App

```bash
npm install
npm start
```

Open `http://127.0.0.1:4173`.

No third-party runtime packages are required; the backend uses Node's built-in HTTP server and Server-Sent Events.

## Verify

```bash
npm run build
npm test
```

## Deploy On Vercel

This app is configured for Vercel with:

- `public/` served as static frontend files.
- `api/index.js` as the Vercel Function adapter for `/api/*`.
- `api/events.js` as a lightweight Server-Sent Events compatibility endpoint.
- `vercel.json` explicit builds/routes so Vercel does not treat `src/server.js` as the root server entrypoint.

Deploy from the project root:

```bash
npm run build
vercel --prod
```

In the Vercel dashboard, keep the default static/build settings and do not set the start command to `npm start`. Vercel runs the API files as Functions instead of running a long-lived Node server.

## Files

- `RAILWAY_INTELLIGENCE_PLATFORM_ARCHITECTURE.md` - full system architecture, data platform, AI pipeline, realtime notification pipeline, reliability model, rollout plan, moat strategy, legal and partnership requirements.
- `database_schema.sql` - initial relational and time-series schema for PostgreSQL plus TimescaleDB.
- `src/server.js` - full-stack Node server, REST API, realtime event stream, routing and alert orchestration.
- `src/domain/booking.js` - booking search, fare breakup, seat reservation, and PNR-style reference helpers.
- `src/domain/intelligence.js` - confidence scoring, crowd trust scoring, platform reconciliation, and trip-risk logic.
- `src/data/seed.js` - realistic pilot data for NDLS and active train trips.
- `public/` - passenger operations frontend.
- `tests/` - Node test coverage for the core intelligence rules.

## Architecture Bias

The design prioritizes:

- source provenance over blind aggregation
- correctness and alert reliability over feature count
- event-driven realtime propagation
- official railway partnerships as the durable data foundation
- crowdsourcing as verification, not as primary authority
- conservative passenger messaging when confidence is incomplete
- station-by-station operational rollout before national expansion

## Official Baseline Sources

- CRIS states that NTES disseminates near real-time passenger train running information for Indian Railways: https://cris.org.in/loadpage?page=proNTES
- Press Information Bureau notes NTES is developed by CRIS and collects train running information on a near real-time basis: https://www.pib.gov.in/newsite/PrintRelease.aspx?relid=99159
- CRIS describes itself as an organization under the Ministry of Railways and references national-scale enquiry/ticketing workloads: https://cris.org.in/
- India Code publishes the Digital Personal Data Protection Act, 2023 text: https://www.indiacode.nic.in/bitstream/123456789/22037/1/a2023-22.pdf
