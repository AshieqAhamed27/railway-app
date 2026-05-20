-- India Railway Intelligence Platform
-- PostgreSQL + TimescaleDB starter schema.
-- This is a production-oriented logical schema, not a complete migration set.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE source_kind AS ENUM (
  'official_ntes',
  'official_station',
  'official_railway_partner',
  'gps',
  'crowd',
  'ai_prediction',
  'operator',
  'third_party'
);

CREATE TYPE confidence_level AS ENUM ('very_low', 'low', 'medium', 'high', 'critical');

CREATE TYPE trip_alert_kind AS ENUM (
  'platform_change',
  'platform_prediction',
  'delay',
  'coach_position',
  'boarding_window',
  'station_entry',
  'navigation',
  'emergency'
);

CREATE TYPE crowd_vote_kind AS ENUM (
  'platform_seen',
  'announcement_heard',
  'display_board_seen',
  'train_arrived',
  'coach_position_seen',
  'contradiction'
);

CREATE TABLE railway_zone (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE station (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  zone_id UUID REFERENCES railway_zone(id),
  city TEXT,
  state TEXT,
  location GEOGRAPHY(POINT, 4326),
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  tier INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE station_area (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES station(id) ON DELETE CASCADE,
  area_kind TEXT NOT NULL, -- entrance, concourse, foot_over_bridge, platform, lift, escalator, restroom, helpdesk
  area_code TEXT NOT NULL,
  name TEXT NOT NULL,
  floor_label TEXT,
  geometry GEOGRAPHY(GEOMETRY, 4326),
  indoor_graph_node_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  UNIQUE (station_id, area_code)
);

CREATE TABLE platform (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES station(id) ON DELETE CASCADE,
  platform_number TEXT NOT NULL,
  serving_line_codes TEXT[] NOT NULL DEFAULT '{}',
  geometry GEOGRAPHY(GEOMETRY, 4326),
  length_meters NUMERIC(8,2),
  accessible BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  UNIQUE (station_id, platform_number)
);

CREATE TABLE platform_edge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES station(id) ON DELETE CASCADE,
  from_area_id UUID NOT NULL REFERENCES station_area(id),
  to_area_id UUID NOT NULL REFERENCES station_area(id),
  mode TEXT NOT NULL, -- walk, stairs, escalator, lift, ramp
  distance_meters NUMERIC(8,2) NOT NULL,
  expected_seconds INT NOT NULL,
  accessible BOOLEAN NOT NULL DEFAULT false,
  congestion_sensitive BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE train_service (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  train_number TEXT NOT NULL UNIQUE,
  train_name TEXT,
  service_type TEXT,
  operator TEXT NOT NULL DEFAULT 'Indian Railways',
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE train_schedule_stop (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  train_service_id UUID NOT NULL REFERENCES train_service(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES station(id),
  stop_sequence INT NOT NULL,
  scheduled_arrival TIME,
  scheduled_departure TIME,
  public_day_offset INT NOT NULL DEFAULT 0,
  halt_minutes INT,
  planned_platform_id UUID REFERENCES platform(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (train_service_id, station_id, stop_sequence)
);

CREATE TABLE train_run (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  train_service_id UUID NOT NULL REFERENCES train_service(id),
  service_date DATE NOT NULL,
  run_key TEXT NOT NULL UNIQUE, -- train_number + service_date + origin day offset
  origin_station_id UUID REFERENCES station(id),
  destination_station_id UUID REFERENCES station(id),
  status TEXT NOT NULL DEFAULT 'scheduled',
  current_delay_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE train_run_stop (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  train_run_id UUID NOT NULL REFERENCES train_run(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES station(id),
  stop_sequence INT NOT NULL,
  scheduled_arrival TIMESTAMPTZ,
  scheduled_departure TIMESTAMPTZ,
  predicted_arrival TIMESTAMPTZ,
  predicted_departure TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  planned_platform_id UUID REFERENCES platform(id),
  current_platform_id UUID REFERENCES platform(id),
  platform_confidence NUMERIC(5,4) NOT NULL DEFAULT 0,
  platform_confidence_level confidence_level NOT NULL DEFAULT 'very_low',
  platform_state_version BIGINT NOT NULL DEFAULT 0,
  last_platform_event_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (train_run_id, station_id, stop_sequence)
);

CREATE TABLE event_ingest_source (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind source_kind NOT NULL,
  source_name TEXT NOT NULL,
  partner_contract_ref TEXT,
  reliability_prior NUMERIC(5,4) NOT NULL DEFAULT 0.5,
  freshness_sla_seconds INT,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  UNIQUE (source_kind, source_name)
);

CREATE TABLE raw_ingest_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES event_ingest_source(id),
  external_event_id TEXT,
  event_type TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL,
  ingest_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  station_id UUID REFERENCES station(id),
  train_run_id UUID REFERENCES train_run(id),
  payload JSONB NOT NULL,
  payload_hash TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT true,
  rejection_reason TEXT,
  UNIQUE (source_id, dedupe_key)
);

CREATE INDEX idx_raw_ingest_event_train_time ON raw_ingest_event (train_run_id, event_time DESC);
CREATE INDEX idx_raw_ingest_event_station_time ON raw_ingest_event (station_id, event_time DESC);

CREATE TABLE platform_assignment_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  train_run_stop_id UUID NOT NULL REFERENCES train_run_stop(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES event_ingest_source(id),
  raw_event_id UUID REFERENCES raw_ingest_event(id),
  platform_id UUID REFERENCES platform(id),
  platform_number_text TEXT,
  assignment_kind TEXT NOT NULL, -- planned, predicted, changed, confirmed, contradicted
  event_time TIMESTAMPTZ NOT NULL,
  ingest_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_confidence NUMERIC(5,4) NOT NULL,
  model_confidence NUMERIC(5,4),
  freshness_score NUMERIC(5,4) NOT NULL DEFAULT 1,
  evidence JSONB NOT NULL DEFAULT '{}',
  state_version BIGINT NOT NULL,
  superseded_by UUID REFERENCES platform_assignment_event(id)
);

CREATE INDEX idx_platform_assignment_event_stop_version
  ON platform_assignment_event (train_run_stop_id, state_version DESC);

CREATE TABLE train_telemetry (
  time TIMESTAMPTZ NOT NULL,
  train_run_id UUID NOT NULL REFERENCES train_run(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES event_ingest_source(id),
  location GEOGRAPHY(POINT, 4326),
  speed_kmph NUMERIC(7,2),
  bearing NUMERIC(6,2),
  accuracy_meters NUMERIC(8,2),
  delay_seconds INT,
  next_station_id UUID REFERENCES station(id),
  raw_event_id UUID REFERENCES raw_ingest_event(id),
  metadata JSONB NOT NULL DEFAULT '{}'
);

SELECT create_hypertable('train_telemetry', 'time', if_not_exists => TRUE);
CREATE INDEX idx_train_telemetry_run_time ON train_telemetry (train_run_id, time DESC);

CREATE TABLE station_congestion_sample (
  time TIMESTAMPTZ NOT NULL,
  station_id UUID NOT NULL REFERENCES station(id) ON DELETE CASCADE,
  area_id UUID REFERENCES station_area(id),
  source_id UUID REFERENCES event_ingest_source(id),
  crowd_density_score NUMERIC(5,4),
  passenger_flow_per_minute NUMERIC(10,2),
  device_count_estimate INT,
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'
);

SELECT create_hypertable('station_congestion_sample', 'time', if_not_exists => TRUE);
CREATE INDEX idx_station_congestion_time ON station_congestion_sample (station_id, time DESC);

CREATE TABLE app_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash TEXT UNIQUE,
  email_hash TEXT UNIQUE,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  home_station_id UUID REFERENCES station(id),
  emergency_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_device (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  device_platform TEXT NOT NULL, -- android, ios, wearos, watchos
  push_token_hash TEXT,
  push_token_ciphertext BYTEA,
  app_version TEXT,
  locale TEXT,
  timezone TEXT,
  last_seen_at TIMESTAMPTZ,
  notification_priority_cap TEXT NOT NULL DEFAULT 'normal',
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE passenger_trip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  train_run_id UUID NOT NULL REFERENCES train_run(id),
  boarding_station_id UUID NOT NULL REFERENCES station(id),
  destination_station_id UUID REFERENCES station(id),
  pnr_hash TEXT,
  pnr_ciphertext BYTEA,
  coach TEXT,
  berth TEXT,
  family_group_id UUID,
  tracking_mode TEXT NOT NULL DEFAULT 'normal', -- normal, family, emergency
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_passenger_trip_user_status ON passenger_trip (user_id, status);
CREATE INDEX idx_passenger_trip_train_boarding ON passenger_trip (train_run_id, boarding_station_id);

CREATE TABLE crowd_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_user(id) ON DELETE SET NULL,
  device_id UUID REFERENCES user_device(id) ON DELETE SET NULL,
  station_id UUID NOT NULL REFERENCES station(id),
  train_run_stop_id UUID REFERENCES train_run_stop(id),
  vote_kind crowd_vote_kind NOT NULL,
  reported_platform_id UUID REFERENCES platform(id),
  reported_platform_text TEXT,
  report_time TIMESTAMPTZ NOT NULL,
  ingest_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_location GEOGRAPHY(POINT, 4326),
  location_accuracy_meters NUMERIC(8,2),
  media_hash TEXT,
  text_note TEXT,
  trust_weight NUMERIC(6,4) NOT NULL DEFAULT 0,
  accepted BOOLEAN NOT NULL DEFAULT false,
  rejection_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_crowd_report_stop_time ON crowd_report (train_run_stop_id, report_time DESC);
CREATE INDEX idx_crowd_report_station_time ON crowd_report (station_id, report_time DESC);

CREATE TABLE user_trust_score (
  user_id UUID PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  station_specific_scores JSONB NOT NULL DEFAULT '{}',
  global_score NUMERIC(6,4) NOT NULL DEFAULT 0.2,
  report_count INT NOT NULL DEFAULT 0,
  accepted_count INT NOT NULL DEFAULT 0,
  contradicted_count INT NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prediction_run (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  prediction_type TEXT NOT NULL, -- platform, delay, congestion, anomaly
  train_run_stop_id UUID REFERENCES train_run_stop(id),
  station_id UUID REFERENCES station(id),
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  horizon_seconds INT NOT NULL,
  confidence NUMERIC(5,4) NOT NULL,
  output JSONB NOT NULL,
  feature_snapshot JSONB NOT NULL,
  calibration_bucket TEXT,
  explanation JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_prediction_run_stop_time ON prediction_run (train_run_stop_id, predicted_at DESC);
CREATE INDEX idx_prediction_run_station_time ON prediction_run (station_id, predicted_at DESC);

CREATE TABLE geofence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES station(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  geofence_kind TEXT NOT NULL, -- station_outer, station_inner, platform_zone, transfer_path
  geometry GEOGRAPHY(GEOMETRY, 4326) NOT NULL,
  min_dwell_seconds INT NOT NULL DEFAULT 15,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE geofence_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  device_id UUID REFERENCES user_device(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES passenger_trip(id) ON DELETE CASCADE,
  geofence_id UUID NOT NULL REFERENCES geofence(id),
  event_kind TEXT NOT NULL, -- enter, exit, dwell
  event_time TIMESTAMPTZ NOT NULL,
  client_time TIMESTAMPTZ,
  location_accuracy_meters NUMERIC(8,2),
  processed BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_geofence_event_trip_time ON geofence_event (trip_id, event_time DESC);

CREATE TABLE alert_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  trip_alert_kind trip_alert_kind NOT NULL,
  min_confidence NUMERIC(5,4) NOT NULL,
  severity TEXT NOT NULL,
  repeat_window_seconds INT NOT NULL,
  escalation_channels TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE notification_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES passenger_trip(id) ON DELETE CASCADE,
  train_run_stop_id UUID REFERENCES train_run_stop(id),
  alert_kind trip_alert_kind NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  confidence NUMERIC(5,4) NOT NULL,
  source_event_ids UUID[] NOT NULL DEFAULT '{}',
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE notification_delivery_attempt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_event_id UUID NOT NULL REFERENCES notification_event(id) ON DELETE CASCADE,
  device_id UUID REFERENCES user_device(id),
  channel TEXT NOT NULL, -- fcm, apns, sms, whatsapp, email, in_app, websocket
  provider_message_id TEXT,
  attempt_number INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'queued',
  error_code TEXT,
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_notification_delivery_event ON notification_delivery_attempt (notification_event_id);
CREATE INDEX idx_notification_delivery_status ON notification_delivery_attempt (status, created_at);

CREATE TABLE websocket_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_user(id) ON DELETE SET NULL,
  device_id UUID REFERENCES user_device(id) ON DELETE SET NULL,
  gateway_region TEXT NOT NULL,
  gateway_instance_id TEXT NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  subscribed_topics TEXT[] NOT NULL DEFAULT '{}',
  connection_state TEXT NOT NULL DEFAULT 'connected',
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_websocket_connection_user ON websocket_connection (user_id, connection_state);
CREATE INDEX idx_websocket_connection_instance ON websocket_connection (gateway_region, gateway_instance_id);

CREATE TABLE data_quality_incident (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_kind TEXT NOT NULL,
  station_id UUID REFERENCES station(id),
  train_run_id UUID REFERENCES train_run(id),
  train_run_stop_id UUID REFERENCES train_run_stop(id),
  severity TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  summary TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}',
  owner_team TEXT,
  status TEXT NOT NULL DEFAULT 'open'
);

CREATE INDEX idx_data_quality_incident_open ON data_quality_incident (status, severity, detected_at DESC);

