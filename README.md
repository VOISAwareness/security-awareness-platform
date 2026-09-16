# Security Awareness Platform

https://img.shields.io/badge/AWS-Cloud%20Native-orange
https://img.shields.io/badge/React-Frontend-blue
https://img.shields.io/badge/Node.js-Backend-green
https://img.shields.io/badge/Aurora-PostgreSQL-blue
https://img.shields.io/badge/License-Proprietary-red

## Overview

The Security Awareness Platform is a cloud-native enterprise application designed to strengthen organizational cybersecurity awareness through awareness campaigns, phishing simulations, learning assignments, gamification, risk scoring, and analytics.

Built on AWS, the platform enables organizations to create targeted security campaigns, assign mandatory awareness training, evaluate user engagement, track training completion, and provide actionable insights through advanced reporting dashboards.

---

# Architecture

## High Level Architecture (HLD)

<p align="center">
  assets/architecture/hld-architecture.png
</p>

<p align="center">
<b>Figure 1:</b> Security Awareness Platform AWS High-Level Architecture
</p>

### Architecture Components

#### Presentation Layer
- React Web Application
- Responsive User Interface
- Dashboard & Reporting Portal

#### Identity & Access Management
- Microsoft Entra ID (SSO)
- OAuth 2.0 Authentication
- Role-Based Access Control (RBAC)

#### Application Layer
- AWS API Gateway
- AWS Lambda Microservices

#### Transactional Data Layer
- Amazon Aurora PostgreSQL

#### Communication Layer
- Amazon SES
- Microsoft Outlook

#### Analytics Layer
- Amazon S3
- AWS Glue
- Amazon Athena

#### Security & Monitoring
- AWS WAF
- AWS CloudWatch
- AWS CloudTrail
- AWS Config

#### Secrets & Encryption
- AWS IAM
- AWS Secrets Manager
- AWS KMS
- AWS Backup

---

# CI/CD & DevSecOps Pipeline

<p align="center">
  <img src="assets/architecture/cicd-pipeline.png"
       alt="CI CD Pipeline"
       width="100%">
</p>

<p align="centerment Workflow

```text
GitHub
   │
   ▼
AWS CodeBuild
   │
   ├── SonarQube Analysis
   │
   ├── Build Docker Image
   │
   ▼
Amazon ECR
   │
   ├── Container Security Scan
   │
   ▼
AWS CodePipeline
   │
   ├── Deployment Approval
   │
   ├── Development Environment
   │
   └── Production Environment
```

---

# Key Features

## Awareness Campaign Management

- Campaign creation
- Campaign scheduling
- Campaign approval workflow
- Audience targeting
- Email personalization
- Multi-region campaign execution

---

## Phishing Simulation

- Phishing campaigns
- Landing page simulation
- Click tracking
- Risk assessment
- User behavior analytics

---

## Learning & Training Management System (LTMS)

### Training Content Management

- Upload awareness videos
- Video categorization
- Version control
- Learning path management

### Video Learning Engine

- Secure video storage in Amazon S3
- Private access using pre-signed URLs
- Progress tracking
- Disable fast-forward functionality
- Unskippable training videos

### Quiz Engine

- Multiple-choice questions
- Multi-select questions
- True/False questions
- Scenario-based questions
- Randomized question sets
- Pass/fail evaluation

### Training Assignment

- Manual assignment
- Campaign-linked assignment
- Automated assignment after phishing click
- Risk-based assignment

### Completion Tracking

- Video completion
- Quiz completion
- Learning journey tracking
- Certificate eligibility

---

## Gamification

- Points allocation
- Badges
- Leaderboards
- Rewards tracking
- Engagement scoring

---

## Risk Scoring

- User risk score
- Department risk score
- Awareness maturity score
- Trend analysis

---

## Reporting & Analytics

### Executive Dashboard

- Campaign effectiveness
- Organizational risk
- Training compliance
- Security trends

### Operational Dashboard

- Open campaigns
- User participation
- Training status
- Quiz performance

### Learning Analytics Dashboard

- Training assigned
- Training completed
- Quiz pass rate
- Video completion rate
- Overdue trainings
- Department-wise completion

---

# User Roles

| Role | Responsibilities |
|--------|------------------|
| Admin | Complete platform administration |
| Campaign Creator | Create awareness campaigns and training assignments |
| Campaign Manager | Manage campaign execution and approvals |
| Regular User | Consume awareness content and complete training |
| Gamification Manager | Manage points, badges, and rewards |
| GMT Leadership | Executive reporting and analytics |

---

# Learning Management Workflow

```text
Campaign Created
        │
        ▼
User Receives Campaign
        │
        ▼
User Clicks Simulation Link
        │
        ▼
Risk Event Generated
        │
        ▼
Training Automatically Assigned
        │
        ▼
User Watches Mandatory Video
        │
        ▼
Video Completion Verified
        │
        ▼
Quiz Enabled
        │
        ▼
User Passes Quiz
        │
        ▼
Training Marked Complete
        │
        ▼
Risk Score Updated
        │
        ▼
Rewards / Badges Issued
```

---

# Technology Stack

## Frontend

```text
React
TypeScript
Redux Toolkit
Material UI
Axios
Chart.js
```

---

## Backend

```text
Node.js
TypeScript
AWS Lambda
REST APIs
API Gateway
```

---

## Database

```text
Amazon Aurora PostgreSQL
```

---

## Analytics

```text
Amazon S3
AWS Glue
Amazon Athena
```

---

## Security

```text
AWS WAF
AWS IAM
AWS KMS
AWS Secrets Manager
CloudTrail
CloudWatch
AWS Config
```

---

# Project Structure

```text
security-awareness-platform/
│
├── assets/
│   └── architecture/
│       ├── hld-architecture.png
│       └── cicd-pipeline.png
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   ├── context/
│   └── components/
│
├── backend/
│   ├── auth/
│   ├── campaigns/
│   ├── training/
│   ├── quizzes/
│   ├── analytics/
│   ├── users/
│   ├── gamification/
│   └── shared/
│
├── database/
│   ├── schema/
│   ├── migrations/
│   └── seeds/
│
├── infrastructure/
│   ├── terraform/
│   ├── cloudformation/
│   ├── cicd/
│   └── scripts/
│
├── docs/
│   ├── BRS/
│   ├── HLD/
│   ├── LLD/
│   ├── API/
│   └── Security/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── performance/
│
└── README.md
```

---

# Database Modules

## Campaign Module

```text
CAMPAIGN
CAMPAIGN_VERSION
CAMPAIGN_APPROVAL
CAMPAIGN_RECIPIENT
```

## User Module

```text
RECIPIENT
REGION
USER_SESSION
```

## Email Module

```text
EMAIL_MESSAGE
EMAIL_EVENT
EMAIL_LINK
```

## Learning Module

```text
TRAINING_CONTENT
TRAINING_ASSIGNMENT
VIDEO_PROGRESS
QUIZ
QUESTION
QUESTION_OPTION
QUIZ_ATTEMPT
TRAINING_COMPLETION
```

## Analytics Module

```text
FACT_CAMPAIGN_DAILY
DIM_USER
DIM_CAMPAIGN
DIM_DATE
```

---

# Security Controls

- SSO Authentication (Microsoft Entra ID)
- Least Privilege Access
- End-to-End Encryption
- Private S3 Storage
- Audit Logging
- Role-Based Authorization
- Data Retention Controls
- Secure Secret Management

---

# Environment Strategy

## Development

```text
DEV
```

## System Integration Testing

```text
SIT
```

## User Acceptance Testing

```text
UAT
```

## Production

```text
PROD
```

---

# Branch Strategy

```text
main
develop

feature/*
bugfix/*
hotfix/*
release/*
```

---

# Commit Convention

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
feat(training): add video completion tracking module
```

---

# Future Roadmap

## Phase 1

- Awareness Campaigns
- User Management
- Authentication

## Phase 2

- Learning Management System
- Quiz Engine
- Completion Tracking

## Phase 3

- Gamification
- Risk Scoring
- Analytics

## Phase 4

- AI Quiz Generation
- Personalized Learning Paths
- Predictive Risk Recommendations

---

# Contributors

Security Awareness Platform Engineering Team

---

# License

Proprietary and Confidential

© Organization Security Team

All Rights Reserved.
