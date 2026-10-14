import { Region, Incident, Runbook, Transaction, Drill } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import * as dr from '../services/drEngine.js';

const rpoLimit = () => Number(process.env.RPO_LIMIT_MS || 60000);
const nums = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Number(v)]));

export const listRegions = async (_req, res) => {
  res.json({ ok: true, data: await Region.find().sort({ role: 1 }) });
};

export const updateRegionMetrics = async (req, res) => {
  const { status, replicationLagMs, successRate } = req.body;
  const set = {};
  if (status) set.status = status;
  if (replicationLagMs != null) set.replicationLagMs = replicationLagMs;
  if (successRate != null) set.successRate = successRate;
  const region = await Region.findOneAndUpdate({ code: req.params.code }, { $set: set }, { new: true, runValidators: true });
  if (!region) throw new HttpError(404, 'Region not found');
  res.json({ ok: true, data: region });
};

export const evaluateFailover = async (req, res) => {
  const since = new Date(Date.now() - 86_400_000);
  const failoversLast24h = await Incident.countDocuments({ createdAt: { $gte: since }, toRegion: { $exists: true } });
  const sig = { healthChecksFailing: 0, successRate: 99.9, replicationLagMs: 0, deploymentInProgress: false, ...req.body, failoversLast24h };
  res.json({ ok: true, data: { signals: sig, ...dr.decideFailover(sig, rpoLimit()) } });
};

export const executeFailover = async (req, res) => {
  const { targetCode, force = false } = req.body;
  const target = await Region.findOne({ code: targetCode });
  const primary = await Region.findOne({ role: 'PRIMARY' });
  if (!target || !primary) throw new HttpError(404, 'Region(s) not found');
  if (target.country !== 'IN' || !target.dataAllowed)
    throw new HttpError(403, 'Blocked: RBI data localisation - target region may not hold payment data');
  if (target.role !== 'SECONDARY') throw new HttpError(400, 'Target must be the SECONDARY region');
  if (target.replicationLagMs > rpoLimit() && !force)
    throw new HttpError(409, `Replication lag ${target.replicationLagMs}ms exceeds RPO ${rpoLimit()}ms. Use force=true after CRO approval`);

  const timing = dr.failoverTiming();
  const incident = await Incident.create({
    title: `Failover ${primary.code} -> ${target.code}`, severity: 'P1', status: 'MITIGATING',
    fromRegion: primary.code, toRegion: target.code, estimatedRtoSec: timing.totalSec,
    timeline: [{ message: `Decision: promote ${target.code} (lag ${target.replicationLagMs}ms, force=${force})` }],
  });
  primary.role = 'SECONDARY'; primary.status = 'DOWN';
  target.role = 'PRIMARY'; target.status = 'HEALTHY';
  await Promise.all([primary.save(), target.save()]);
  incident.timeline.push({ message: 'Roles swapped; DNS UPSERT + Aurora failover-global-cluster issued' });
  await incident.save();
  res.status(201).json({ ok: true, data: { incident, timing } });
};

export const listIncidents = async (_req, res) => res.json({ ok: true, data: await Incident.find().sort({ createdAt: -1 }).limit(50) });

export const listRunbooks = async (req, res) => {
  const q = {};
  if (req.query.category) q.category = req.query.category;
  if (req.query.severity) q.severity = req.query.severity;
  const data = await Runbook.find(q).sort({ rbId: 1 });
  res.json({ ok: true, data: data.map((r) => ({ ...r.toObject(), totalSec: r.steps.reduce((a, s) => a + s.sec, 0) })) });
};

export const getRunbook = async (req, res) => {
  const rb = await Runbook.findOne({ rbId: req.params.id.toUpperCase() });
  if (!rb) throw new HttpError(404, 'Runbook not found');
  res.json({ ok: true, data: rb });
};

export const latencyBudget = (req, res) => {
  const { rtt = 25, commit = 5, writes = 1 } = nums(req.query);
  res.json({ ok: true, data: dr.latencyBudget({ rttMs: rtt, commitMs: commit, writesInPath: writes }) });
};
export const timing = (req, res) => res.json({ ok: true, data: dr.failoverTiming(nums(req.query)) });
export const splitBrain = (req, res) => {
  const { minutes = 3, tps = 1200, dup = 0.5 } = nums(req.query);
  res.json({ ok: true, data: dr.splitBrainExposure({ minutes, tps, duplicateRatePct: dup }) });
};
export const cost = (req, res) => res.json({ ok: true, data: dr.downtimeCost({ hours: Number(req.query.hours || 1) }) });
export const fmea = (_req, res) => res.json({ ok: true, data: dr.FMEA });

/** Idempotent payment create: same key => same transaction, never double-charged. */
export const createTransaction = async (req, res) => {
  const key = req.header('Idempotency-Key');
  if (!key) throw new HttpError(400, 'Idempotency-Key header required');
  const { merchantId, amount } = req.body;
  const region = (await Region.findOne({ role: 'PRIMARY' }))?.code || 'ap-south-1';
  const result = await Transaction.findOneAndUpdate(
    { idempotencyKey: key },
    { $setOnInsert: { idempotencyKey: key, merchantId, amount, region, status: 'SUCCESS' } },
    { upsert: true, new: true, includeResultMetadata: true, runValidators: true, setDefaultsOnInsert: true });
  const replayed = result.lastErrorObject?.updatedExisting === true;
  res.status(replayed ? 200 : 201).json({ ok: true, replayed, data: result.value });
};

export const logDrill = async (req, res) => res.status(201).json({ ok: true, data: await Drill.create(req.body) });
export const listDrills = async (_req, res) => res.json({ ok: true, data: await Drill.find().sort({ createdAt: -1 }).limit(50) });
