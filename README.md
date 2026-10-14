# PaySecure DR Command Center

### Multi-Region Payment Disaster Recovery & High Availability Platform

PaySecure DR Command Center is a cloud disaster recovery and monitoring platform designed to improve the availability and reliability of payment systems. It helps monitor cloud regions, detect service failures, evaluate failover readiness, track recovery objectives, and manage disaster recovery drills through a centralized dashboard.

## 🚀 Project Overview

Payment systems require high availability because service downtime can interrupt transactions and affect customer experience. PaySecure DR Command Center provides a centralized interface to monitor infrastructure health, manage incidents, analyze recovery performance, and coordinate disaster recovery operations.

The platform is designed around a primary cloud region and a secondary recovery region.

## ✨ Key Features

- **Multi-Region Monitoring:** Monitor primary and secondary region health.
- **Failover Decision Engine:** Evaluate whether to fail over, hold, or request manual review.
- **Incident Management:** Record incidents, severity, status, and event timelines.
- **Runbook Explorer:** Organize disaster recovery procedures and recovery steps.
- **RPO & RTO Tracking:** Monitor Recovery Point Objective and Recovery Time Objective.
- **DR Drill Management:** Record disaster recovery tests and their results.
- **Payment Transaction Simulation:** Demonstrate transaction status handling and idempotency.
- **DR Analytics:** Analyze latency, downtime estimates, recovery performance, and risk exposure.
- **Auditability:** Maintain records of recovery actions and operational events where supported by the implementation.

## 🛠️ Technology Stack

- **Frontend:** HTML, CSS, JavaScript, and dashboard visualization libraries as configured in the project.
- **Backend:** Node.js and Express.js.
- **Database:** MongoDB.
- **Cloud Integration (planned):** AWS CloudWatch, Route 53, and other AWS services.
- **Infrastructure as Code (planned):** Terraform.
- **Version Control:** Git and GitHub.

*Note: Planned integrations should be considered future enhancements until they are connected and tested.*

## 🏗️ System Workflow

1. Collect region health and monitoring metrics.
2. Evaluate latency, replication lag, and service availability.
3. Detect failures and create incident records.
4. Evaluate the failover decision.
5. Verify secondary-region readiness and data consistency.
6. Execute or approve the recovery workflow according to configured controls.
7. Verify transaction status and service recovery.
8. Record recovery results for monitoring and analysis.

## 🎯 Recovery Objectives

The following are example targets that can be configured for demonstration:

- **RPO (Recovery Point Objective):** 60 seconds.
- **RTO (Recovery Time Objective):** 300 seconds (5 minutes).

RPO represents the acceptable amount of data loss measured in time. RTO represents the target time for restoring a service.

These are target values, not guaranteed recovery results. Actual recovery performance must be measured through testing.

## 📋 Prerequisites

- Node.js and npm.
- MongoDB installed locally or a configured MongoDB connection.
- Visual Studio Code or another code editor.
- Git (optional, for version control).

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd paysecure-dr
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual repository URL.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root using the variable names supported by your backend configuration.

Example:

```env
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/paysecure_dr
RPO_LIMIT_MS=60000
RTO_LIMIT_SEC=300
```

Ensure that these names match the configuration used in your application.

### 4. Start MongoDB

Start your local MongoDB service, or configure a valid database connection.

### 5. Start the application

Use the command supported by your `package.json`. For example:

```bash
npm run dev
```

If the project uses a different script, run the appropriate command from `package.json`.

Open the local URL shown in your terminal, such as `http://localhost:4000`, if that is the configured application port.

## 🔌 API Overview

The backend can expose APIs for the following operations, depending on the implemented routes:

- Region health and monitoring.
- Failover readiness evaluation.
- Incident creation and retrieval.
- Runbook and recovery-step management.
- Disaster recovery drill records.
- Analytics and transaction simulation.

Refer to the backend route files for the exact endpoint paths and request formats.

## 🔐 Security and Reliability

- Use role-based permissions for sensitive recovery operations.
- Validate inputs and protect API endpoints.
- Maintain audit records for important actions.
- Use idempotency controls to prevent duplicate payment processing.
- Verify database consistency before failover.
- Test recovery workflows in a non-production environment before connecting real infrastructure.

## 🔮 Future Enhancements

- Integrate real-time AWS CloudWatch metrics and alarms.
- Configure Route 53 health checks and controlled DNS failover.
- Add administrator, SRE, and viewer roles.
- Introduce live dashboard updates using WebSockets or Server-Sent Events.
- Generate downloadable disaster recovery reports.
- Automate recovery testing using Terraform and CI/CD pipelines.
- Add email or Slack incident notifications.

## 💼 Use Cases

- Cloud disaster recovery demonstrations.
- Payment service availability monitoring.
- Multi-region infrastructure simulations.
- DevOps and cloud engineering learning projects.
- Disaster recovery planning and operational readiness testing.

## ⚠️ Disclaimer

This project is intended for learning, demonstration, and controlled testing. Dashboard metrics and simulated recovery decisions do not automatically represent real cloud infrastructure status. Production use requires validated cloud integrations, security controls, database consistency checks, and tested recovery procedures.

## 👨‍💻 Author

**Your Name**

Cloud Computing | DevOps | Disaster Recovery | Full-Stack Development
