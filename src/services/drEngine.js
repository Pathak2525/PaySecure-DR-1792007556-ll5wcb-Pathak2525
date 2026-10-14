// Pure functions: no DB access, easy to unit-test.
export const BASE = Object.freeze({
  dailyTxns: 3_200_000,
  dailyValueCr: 500,
  peakTps: 1200,
  p99Ms: 180,
  upiLimitMs: 300,
  revenuePerHourLakh: 37.5,
});

/** Latency budget exercise: can a component afford synchronous replication? */
export function latencyBudget({ p99Ms = BASE.p99Ms, limitMs = BASE.upiLimitMs, rttMs, commitMs = 5, writesInPath = 1 }) {
  const added = (rttMs + commitMs) * writesInPath;
  const newP99 = p99Ms + added;
  const headroom = limitMs - newP99;
  return {
    addedMs: added, newP99Ms: newP99, headroomMs: headroom,
    syncViable: headroom >= 40,
    verdict: headroom >= 40 ? 'SYNC_OK' : headroom > 0 ? 'ASYNC_RECOMMENDED' : 'ASYNC_REQUIRED',
  };
}

/** Real-world RTO = detection + decision + promotion + DNS TTL + retry storm. */
export function failoverTiming({ intervalSec = 10, threshold = 3, decisionSec = 15, promotionSec = 90, ttlSec = 60, retryStormSec = 30 } = {}) {
  const detection = intervalSec * threshold;
  const total = detection + decisionSec + promotionSec + ttlSec + retryStormSec;
  return { detection, decisionSec, promotionSec, ttlSec, retryStormSec, totalSec: total, meetsRto: total < 300 };
}

/** Split-brain financial exposure. */
export function splitBrainExposure({ minutes = 3, tps = BASE.peakTps, duplicateRatePct = 0.5 } = {}) {
  const avgTicketInr = (BASE.dailyValueCr * 1e7) / BASE.dailyTxns;
  const txns = tps * 60 * minutes;
  const duplicates = Math.ceil(txns * (duplicateRatePct / 100));
  return {
    avgTicketInr: Number(avgTicketInr.toFixed(2)), txnsDuringPartition: txns,
    duplicateTxns: duplicates, maxExposureInr: Math.round(duplicates * avgTicketInr),
    worstCaseAllDuplicateInr: Math.round(txns * avgTicketInr),
  };
}

/** Downtime cost model. */
export function downtimeCost({ hours = 1, finePerP1Cr = 2, churnPct = 1, slaCreditLakh = 5, engineerHours = 500 } = {}) {
  const direct = BASE.revenuePerHourLakh * hours;
  const fines = finePerP1Cr * 100;
  const churn = BASE.revenuePerHourLakh * 24 * 365 * (churnPct / 100);
  const ops = (engineerHours * 3000) / 1e5;
  return {
    blockedVolumeCr: Number(((BASE.dailyValueCr / 24) * hours).toFixed(2)),
    directRevenueLakh: direct, slaCreditLakh, regulatoryFineLakh: fines,
    churnLakh: Number(churn.toFixed(2)), opsRecoveryLakh: ops,
    totalLakh: Number((direct + slaCreditLakh + fines + churn + ops).toFixed(2)),
  };
}

export const FMEA = [
  ['Aurora Writer', 'Instance crash', 9, 3, 2], ['Aurora Writer', 'Storage corruption', 10, 2, 5],
  ['Aurora Replication', 'Lag exceeds RPO', 8, 4, 3], ['DynamoDB Global', 'Conflict resolution error', 7, 3, 6],
  ['Route 53', 'Health check false positive', 7, 3, 3], ['Route 53', 'Health check false negative', 9, 2, 7],
  ['CI/CD', 'Single-region deploy', 7, 4, 5], ['KMS', 'Key compromise', 10, 1, 8],
  ['Cross-Region Net', 'Network partition', 9, 2, 3], ['MSK', 'Replicator lag > 10k msgs', 7, 4, 4],
].map(([component, failureMode, s, o, d]) => ({ component, failureMode, s, o, d, rpn: s * o * d }))
 .sort((a, b) => b.rpn - a.rpn);

/**
 * Automated failover decision engine (weighted signals).
 * >=70 FAILOVER, 40..69 MANUAL_REVIEW, else HOLD.
 */
export function decideFailover(sig, rpoLimitMs = 60_000) {
  const w = { health: 35, success: 25, lag: 15, deploy: 10, flap: 15 };
  let score = 0; const reasons = [];
  if (sig.healthChecksFailing >= 3) { score += w.health; reasons.push('3+ health checks failing'); }
  else if (sig.healthChecksFailing > 0) score += w.health * (sig.healthChecksFailing / 3);
  if (sig.successRate < 99.5) { score += w.success * Math.min(1, (99.5 - sig.successRate) / 10); reasons.push(`success rate ${sig.successRate}%`); }
  if (sig.replicationLagMs <= rpoLimitMs) score += w.lag; else reasons.push('lag exceeds RPO: data-loss risk');
  if (!sig.deploymentInProgress) score += w.deploy; else reasons.push('deployment in progress');
  if (sig.failoversLast24h === 0) score += w.flap; else reasons.push('recent failover: flapping guard');
  score = Math.round(score);
  const decision = score >= 70 ? 'FAILOVER' : score >= 40 ? 'MANUAL_REVIEW' : 'HOLD';
  return { score, decision, reasons, rpoSafe: sig.replicationLagMs <= rpoLimitMs };
}
