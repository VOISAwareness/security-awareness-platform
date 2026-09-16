# Security Awareness Platform

## Overview

The Security Awareness Platform (SAP) is a cloud-native web application designed to improve enterprise cybersecurity awareness through campaigns, simulations, learning assignments, gamification, risk scoring, and analytics.

The platform enables organizations to create security awareness programs, manage targeted campaigns, measure employee engagement, track learning completion, and gain actionable security insights through dashboards and reports.

---

## Key Features

### Campaign Management
- Create and manage awareness campaigns
- Schedule campaigns
- Email template management
- Campaign versioning
- Approval workflows
- Audience targeting

### Training Management
- Assign learning paths
- Learning content tracking
- Video-based awareness training
- Quiz and assessment support
- Training completion monitoring

### Phishing Simulation
- Simulation campaign management
- Email interaction tracking
- Landing page simulation
- User behavior monitoring
- Phishing awareness measurement

### Gamification
- Points management
- Badge system
- Leaderboards
- Engagement tracking
- Reward mechanisms

### Risk Scoring
- Dynamic risk score calculation
- User risk categorization
- Department risk assessment
- Trend analysis

### Analytics & Reporting
- Executive dashboards
- Operational reporting
- Security awareness KPIs
- Campaign performance reports
- Risk reporting
- Training compliance tracking

### Security & Compliance
- Microsoft Entra ID SSO
- RBAC authorization
- Audit logging
- Data encryption
- Secure API architecture
- AWS security controls

---

# Architecture

## High-Level Architecture

```text
React Frontend
      │
      ▼
AWS WAF
      │
      ▼
Amazon API Gateway
      │
      ▼
AWS Lambda Services
      │
 ┌────┼────┐
 ▼    ▼    ▼
Aurora SES S3
Postgres     Data Lake
      │
      ▼
AWS Glue
      │
      ▼
Amazon Athena
      │
      ▼
Analytics Dashboard
```

---

# Technology Stack

## Frontend

- React.js
- TypeScript
- Redux Toolkit
- Material UI
- Chart.js
- Axios

## Backend

- AWS Lambda
- Node.js
- TypeScript
- REST APIs
- API Gateway

## Database

- Amazon Aurora PostgreSQL

## Analytics

- Amazon Athena
- AWS Glue
- Amazon S3

## Communication

- Amazon SES
- Microsoft Outlook

## Authentication

- Microsoft Entra ID
- OAuth 2.0
- OpenID Connect

## Monitoring

- CloudWatch
- CloudTrail
- AWS Config

---

# User Roles

| Role | Description |
|--------|------------|
| Admin | Full platform administration |
| Campaign Creator | Creates campaigns and templates |
| Campaign Manager | Executes campaigns and manages approvals |
| Regular User | Consumes training and awareness content |
| Gamification Manager | Manages points, badges, rewards |
| GMT Leadership | Access to executive dashboards |

---

# Project Structure

```text
security-awareness-platform/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── assets/
│   ├── pages/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   ├── context/
│   └── utils/
│
├── backend/
│   ├── lambda/
│   │   ├── auth/
│   │   ├── campaigns/
│   │   ├── trainings/
│   │   ├── analytics/
│   │   ├── gamification/
│   │   └── users/
│   │
│   ├── shared/
│   └── layers/
│
├── infrastructure/
│   ├── terraform/
│   ├── cloudformation/
│   └── scripts/
│
├── database/
│   ├── schema/
│   ├── migrations/
│   └── seeds/
│
├── analytics/
│   ├── athena/
│   ├── glue-jobs/
│   └── reports/
│
├── docs/
│   ├── BRD/
│   ├── HLD/
│   ├── LLD/
│   └── API/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── performance/
│
└── README.md
```

---

# Core Modules

## User Management

- User onboarding
- Profile management
- RBAC
- SSO Integration

## Campaign Module

- Campaign lifecycle
- Scheduling
- Personalization
- Target audience management

## Training Module

- Training assignment
- Learning paths
- Quiz management
- Completion tracking

## Simulation Module

- Scenario management
- Email simulation
- Landing page simulation
- Event tracking

## Gamification Module

- Point engine
- Badge engine
- Leaderboards
- Achievement tracking

## Analytics Module

- KPI calculation
- Dashboard engine
- Data aggregation
- Reporting service

---

# Database Highlights

### Important Entities

```text
REGION
CAMPAIGN
CAMPAIGN_VERSION
CAMPAIGN_APPROVAL

RECIPIENT
RECIPIENT_IMPORT_BATCH
CAMPAIGN_RECIPIENT

EMAIL_LINK
EMAIL_MESSAGE
EMAIL_EVENT

USER_SESSION
INTERACTION_EVENT

AUDIT_LOG

FACT_CAMPAIGN_DAILY
DIM_USER
DIM_CAMPAIGN
DIM_DATE
```

---

# API Examples

## Authentication

```http
POST /api/v1/auth/login
```

## Campaigns

```http
GET    /api/v1/campaigns
POST   /api/v1/campaigns
PUT    /api/v1/campaigns/{id}
DELETE /api/v1/campaigns/{id}
```

## Training

```http
GET    /api/v1/training
POST   /api/v1/training/assign
```

## Analytics

```http
GET /api/v1/analytics/dashboard
```

---

# Deployment

## Environments

- Development
- SIT
- UAT
- Production

## AWS Services

- AWS WAF
- API Gateway
- Lambda
- Aurora PostgreSQL
- Amazon SES
- Amazon S3
- AWS Glue
- Amazon Athena
- CloudWatch
- CloudTrail
- AWS Backup

---

# Security

- SSO Authentication
- Role-Based Access Control
- Encryption at Rest
- Encryption in Transit
- Audit Logging
- Least Privilege Access
- Data Retention Policies
- AWS Security Best Practices

---

# Development Standards

## Branch Strategy

```text
main
develop
feature/*
bugfix/*
hotfix/*
release/*
```

## Commit Convention

```text
feat:
fix:
docs:
refactor:
test:
chore:
```

Example:

```text
feat(campaign): add campaign scheduling feature
```

---

# Roadmap

## Phase 1
- User Management
- Authentication
- Campaign Management

## Phase 2
- Training Module
- Email Tracking
- Reporting

## Phase 3
- Gamification
- Risk Scoring
- Analytics Dashboards

## Phase 4
- AI-Powered Recommendations
- Advanced Threat Awareness
- Predictive Risk Insights

---

# Contribution

1. Fork Repository
2. Create Feature Branch
3. Commit Changes
4. Create Pull Request
5. Code Review
6. Merge

---

# License

Proprietary © VOIS

All rights reserved.
