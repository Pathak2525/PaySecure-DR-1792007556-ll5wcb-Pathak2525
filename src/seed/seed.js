import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Region, Runbook } from '../models/index.js';

const S = (role, action, cmd, sec) => ({ role, action, cmd, sec });
const SRE = 'Primary on-call SRE', DBA = 'DBA on rotation', IC = 'Incident Commander', SEC = 'Security Engineer';

const raw = [
  ['RB-01', 'Complete Primary Region Failure', 'infrastructure', 'P1', [
    S(IC, 'Declare P1, open war room', `curl -X POST https://events.pagerduty.com/v2/enqueue -d @p1.json`, 15),
    S(SRE, 'Check Route53 health status', `aws route53 get-health-check-status --health-check-id $HC_ID`, 20),
    S(SRE, 'Rule out partition vs region down (canary from ap-south-2)', `aws synthetics get-canary-runs --name pay-canary --region ap-south-2`, 20),
    S(DBA, 'Verify Aurora lag before promote', `aws cloudwatch get-metric-statistics --namespace AWS/RDS --metric-name AuroraGlobalDBReplicationLag --dimensions Name=DBClusterIdentifier,Value=paysecure-secondary --start-time $(date -u -d '2 minutes ago' +%FT%T) --end-time $(date -u +%FT%T) --period 60 --statistics Maximum --region ap-south-2`, 15),
    S(DBA, 'Promote secondary (unplanned)', `aws rds failover-global-cluster --global-cluster-identifier paysecure-global --target-db-cluster-identifier arn:aws:rds:ap-south-2:$ACCOUNT:cluster:paysecure-secondary --allow-data-loss`, 60),
    S(SRE, 'Scale DR pods', `kubectl --context paysecure-dr -n paysecure scale deployment payment-api --replicas=12`, 30),
    S(SRE, 'Flip DNS to DR ALB', `aws route53 change-resource-record-sets --hosted-zone-id $ZONE --change-batch file://failover.json`, 20),
    S(SRE, 'Verify health endpoint', `curl -fs https://api.paysecure.in/health/deep`, 15),
  ]],
  ['RB-02', 'Database Corruption', 'data', 'P1', [
    S(DBA, 'Pause writes via feature flag', `kubectl -n paysecure set env deploy/transaction-processor WRITES_PAUSED=true`, 20),
    S(DBA, 'Stop replication to DR', `aws rds remove-from-global-cluster --global-cluster-identifier paysecure-global --db-cluster-identifier arn:aws:rds:ap-south-1:$ACCOUNT:cluster:paysecure-primary`, 45),
    S(DBA, 'Point-in-time restore', `aws rds restore-db-cluster-to-point-in-time --source-db-cluster-identifier paysecure-primary --db-cluster-identifier paysecure-recovery --restore-to-time $T --restore-type full-copy`, 240),
    S(DBA, 'Count affected rows', `psql -c "SELECT count(*) FROM transactions WHERE updated_at > now() - interval '15 min'"`, 30),
  ]],
  ['RB-03', 'DNS Poisoning / Route 53 Failure', 'security', 'P2', [
    S(SEC, 'Check DNSSEC chain', `dig +dnssec api.paysecure.in`, 15),
    S(SRE, 'Get ALB name for direct partner access', `aws elbv2 describe-load-balancers --names paysecure-alb --query 'LoadBalancers[0].DNSName'`, 60),
    S(SEC, 'Report to CERT-In (6h window)', `echo "file incident at cert-in.org.in"`, 120),
  ]],
  ['RB-04', 'Kafka Cluster Failure', 'infrastructure', 'P2', [
    S(SRE, 'Check MSK state', `aws kafka describe-cluster --cluster-arn $MSK_ARN --query ClusterInfo.State`, 15),
    S(SRE, 'Enable direct-DB write bypass', `kubectl -n paysecure set env deploy/settlement-engine QUEUE_BYPASS=true`, 30),
    S(SRE, 'Check DR consumer lag', `kafka-consumer-groups.sh --bootstrap-server $DR_BOOTSTRAP --group settlement-processor --describe`, 60),
  ]],
  ['RB-05', 'Network Partition Between Regions', 'infrastructure', 'P1', [
    S(SRE, 'Confirm both regions healthy via canaries', `aws synthetics get-canary-runs --name pay-canary --region ap-south-1`, 20),
    S(IC, 'Fence secondary: stop writes in ap-south-2', `kubectl --context paysecure-dr -n paysecure scale deploy/transaction-processor --replicas=0`, 30),
    S(DBA, 'Find duplicates by idempotency key after heal', `psql -c "SELECT idempotency_key, count(*) FROM txns GROUP BY 1 HAVING count(*)>1"`, 120),
  ]],
  ['RB-06', 'KMS Key Compromise', 'security', 'P1', [
    S(SEC, 'Disable compromised key', `aws kms disable-key --key-id $KEY_ID`, 10),
    S(SEC, 'Create new multi-region key', `aws kms create-key --multi-region --description "CHD key v2"`, 20),
    S(SEC, 'Notify card networks (PCI 72h)', `echo "send regulatory template"`, 300),
  ]],
  ['RB-07', 'DDoS on Payment API', 'security', 'P2', [
    S(SEC, 'Check Shield events', `aws shield list-attacks --start-time $START --end-time $END`, 30),
    S(SRE, 'Review WAF rate rule', `aws wafv2 get-rule-group --name paysecure-rl --scope REGIONAL --id $ID --region ap-south-1`, 45),
  ]],
  ['RB-08', 'NPCI / UPI Outage', 'external', 'P3', [
    S(SRE, 'Confirm external failure (UPI only)', `curl -s https://api.paysecure.in/health/upi`, 20),
    S(IC, 'Merchant advisory: promote cards/netbanking', `echo "send merchant template"`, 120),
  ]],
  ['RB-09', 'Certificate Expiry / TLS Failure', 'infrastructure', 'P2', [
    S(SRE, 'Check cert expiry', `echo | openssl s_client -connect api.paysecure.in:443 2>/dev/null | openssl x509 -noout -enddate`, 10),
    S(SRE, 'Request new ACM cert', `aws acm request-certificate --domain-name api.paysecure.in --validation-method DNS`, 120),
  ]],
  ['RB-10', 'Single AZ Power Failure', 'infrastructure', 'P3', [
    S(SRE, 'List unready nodes', `kubectl get nodes | grep -v Ready`, 15),
    S(DBA, 'Verify Aurora auto-failover', `aws rds describe-db-clusters --db-cluster-identifier paysecure-primary --query 'DBClusters[0].DBClusterMembers'`, 30),
  ]],
  ['RB-11', 'Ransomware on Infrastructure', 'security', 'P1', [
    S(SEC, 'Isolate namespace (deny-all NetworkPolicy)', `kubectl apply -f netpol-deny-all.yaml`, 30),
    S(SEC, 'Cordon and drain affected nodes', `kubectl cordon $NODE && kubectl drain $NODE --ignore-daemonsets`, 60),
    S(IC, 'Rebuild from IaC in clean account', `terraform -chdir=configs/terraform apply -auto-approve`, 600),
  ]],
  ['RB-12', 'Cascading Microservice Failure', 'application', 'P2', [
    S(SRE, 'Check fraud-detection logs', `kubectl -n paysecure logs deploy/fraud-detection --tail=100`, 20),
    S(SRE, 'Bypass fraud check with elevated monitoring', `kubectl -n paysecure set env deploy/transaction-processor FRAUD_BYPASS=true`, 30),
    S(SRE, 'Rollback deployment', `kubectl -n paysecure rollout undo deploy/fraud-detection`, 60),
  ]],
];
const runbooks = raw.map(([rbId, name, category, severity, steps]) => ({ rbId, name, category, severity, steps }));

const regions = [
  { code: 'ap-south-1', name: 'Mumbai', city: 'Mumbai', role: 'PRIMARY', replicationLagMs: 0 },
  { code: 'ap-south-2', name: 'Hyderabad', city: 'Hyderabad', role: 'SECONDARY', replicationLagMs: 400 },
  { code: 'ap-southeast-1', name: 'Singapore', city: 'Singapore', country: 'SG', role: 'TERTIARY', dataAllowed: false },
];

await connectDB(process.env.MONGO_URI);
await Promise.all([Region.deleteMany({}), Runbook.deleteMany({})]);
await Region.insertMany(regions);
await Runbook.insertMany(runbooks);
console.log(`[seed] ${regions.length} regions, ${runbooks.length} runbooks`);
await mongoose.disconnect();
