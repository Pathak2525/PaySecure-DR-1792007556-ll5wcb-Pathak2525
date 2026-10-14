import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const regionSchema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  city: String,
  country: { type: String, default: 'IN' },
  role: { type: String, enum: ['PRIMARY', 'SECONDARY', 'TERTIARY'], required: true },
  status: { type: String, enum: ['HEALTHY', 'DEGRADED', 'DOWN'], default: 'HEALTHY' },
  replicationLagMs: { type: Number, default: 0 },
  successRate: { type: Number, default: 99.9 },
  dataAllowed: { type: Boolean, default: true },
}, { timestamps: true });

const incidentSchema = new Schema({
  title: String,
  severity: { type: String, enum: ['P1', 'P2', 'P3'], default: 'P1' },
  status: { type: String, enum: ['DETECTED', 'MITIGATING', 'RESOLVED'], default: 'DETECTED' },
  fromRegion: String,
  toRegion: String,
  estimatedRtoSec: Number,
  timeline: [{ at: { type: Date, default: Date.now }, message: String }],
}, { timestamps: true });

const stepSchema = new Schema({ role: String, action: String, cmd: String, sec: Number }, { _id: false });

const runbookSchema = new Schema({
  rbId: { type: String, unique: true },
  name: String,
  category: { type: String, enum: ['infrastructure', 'application', 'data', 'security', 'external'] },
  severity: { type: String, enum: ['P1', 'P2', 'P3'] },
  steps: [stepSchema],
});

const transactionSchema = new Schema({
  idempotencyKey: { type: String, required: true, unique: true, index: true },
  merchantId: { type: String, required: true, index: true },
  amount: { type: Number, required: true, min: 1 },
  region: String,
  status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], default: 'SUCCESS' },
}, { timestamps: true });

const drillSchema = new Schema({
  type: { type: String, enum: ['COMPONENT', 'FULL_FAILOVER', 'WEEKLY_CHECK'] },
  scenario: String,
  durationSec: Number,
  passed: Boolean,
  notes: String,
}, { timestamps: true });

export const Region = model('Region', regionSchema);
export const Incident = model('Incident', incidentSchema);
export const Runbook = model('Runbook', runbookSchema);
export const Transaction = model('Transaction', transactionSchema);
export const Drill = model('Drill', drillSchema);
