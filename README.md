# Security Awareness Platform

https://img.shields.io/badge/License-Proprietary-red
![AWS](https://img.shields.io/badge/AWS-Cloud-orange)](https://img.shields.io/badge/React-Frontend-blue)
ss](https://img.shields.io/badge/erverless-green

---

# Overview

The Security Awareness Platform is an enterprise-grade cloud-native application designed to improve cybersecurity awareness across the organization through:

- Security Awareness Campaigns
- Phishing Simulations
- Learning & Training Management
- Quiz Assessments
- Employee Risk Scoring
- Gamification
- Executive Reporting & Analytics

The platform is built using AWS serverless services and follows security-by-design principles with Microsoft Entra ID integration for Single Sign-On (SSO).

---

# High Level Architecture

The platform follows a cloud-native, serverless architecture deployed on AWS.

docs/architecture.png

**Figure 1:** Security Awareness Platform AWS Architecture

---

# DevSecOps CI/CD Pipeline

The application follows a secure DevSecOps pipeline ensuring code quality, security scanning, container validation, and automated deployment.

docs/cicd-pipeline.png

**Figure 2:** GitHub → SonarQube → AWS CodeBuild → Amazon ECR → AWS CodePipeline Deployment Flow

---

# Key Features

## Campaign Management

- Create awareness campaigns
- Campaign scheduling
- Target audience management
- Email template management
- Campaign approval workflows
- Campaign analytics

---

## Phishing Simulations

- Phishing email simulations
- User interaction tracking
- Landing page simulations
- Failure detection
- Awareness effectiveness measurement

---

## Learning Management System (LMS)

### Video Based Learning

- Training videos stored in Amazon S3
- Category-based content management
- Campaign-specific learning assignments
- Mandatory learning paths
- Secure video delivery using Pre-Signed URLs

### Unskippable Video Training

- Watch progress tracking
- Video completion monitoring
- Disable forward seeking
- Resume playback from last progress
- Mandatory completion before quiz access

### Quiz Engine

- Multiple Choice Questions (MCQ)
- Multiple Select Questions
- True / False Questions
- Scenario-Based Questions
- Randomized Question Sets

### Training Assessment

- Pass / Fail Evaluation
- Configurable Passing Scores
- Multiple Attempts Configuration
- Automated Completion Tracking

---

## Risk Scoring

- User Risk Calculation
- Campaign Performance Scoring
- Training Compliance Scoring
- Department Risk Analysis
- Trend Monitoring

---

## Gamification

- Employee Points System
- Achievement Badges
- Leaderboards
- Security Champions Recognition

---

## Reporting & Analytics

- Executive Dashboard
- Campaign Analytics
- Department Reports
- User Awareness Reports
- Training Completion Reports
- Risk Trend Analysis

---

# Technology Stack

## Frontend

- React.js
- TypeScript
- Redux Toolkit
- Material UI
- Axios

---

## Backend

- AWS Lambda
- Node.js
- REST APIs
- Serverless Architecture

---

## Authentication

- Microsoft Entra ID
- OAuth 2.0
- OpenID Connect

---

## Database

- Amazon Aurora PostgreSQL

---

## Analytics

- Amazon Athena
- AWS Glue
- Amazon S3

---

## Communication

- Amazon SES
- Microsoft Outlook

---

## Security Services

- AWS WAF
- AWS IAM
- AWS Secrets Manager
- AWS KMS
- AWS Config
- AWS CloudTrail
- AWS CloudWatch
- AWS Backup

---

# User Roles

| Role | Description |
|--------|------------|
| Admin | Platform Administration |
| Campaign Creator | Create and Configure Campaigns |
| Campaign Manager | Execute Campaigns |
| Regular User | Training and Awareness Consumer |
| Gamification Manager | Manage Badges and Points |
| GMT Leadership | Executive Analytics Dashboard |

---

# Learning Management Workflow

```text
Campaign Created
        │
        ▼
User Receives Campaign
        │
        ▼
User Clicks Phishing Link
        │
        ▼
Training Automatically Assigned
        │
        ▼
User Watches Video
        │
        ▼
Video Completion Validated
        │
        ▼
Quiz Enabled
        │
        ▼
Quiz Passed
        │
        ▼
Training Completed
        │
        ▼
Risk Score Updated
        │
        ▼
Gamification Points Awarded
```

---

# Project Structure

```text
security-awareness-platform
│
├── docs
│   ├── architecture.png
│   └── cicd-pipeline.png
│
├── frontend
│   ├── src
│   ├── pages
│   ├── components
│   ├── services
│   └── assets
│
├── backend
│   ├── auth
│   ├── campaigns
│   ├── analytics
│   ├── training
│   ├── gamification
│   └── users
│
├── infrastructure
│   ├── terraform
│   ├── cloudformation
│   └── pipelines
│
├── database
│   ├── schema
│   ├── migrations
│   └── seeds
│
├── tests
│   ├── unit
│   ├── integration
│   └── security
│
├── README.md
└── LICENSE
```

---

# CI/CD Pipeline Flow

```text
GitHub
   │
   ▼
SonarQube Analysis
   │
   ▼
AWS CodeBuild
   │
   ▼
Docker Image Build
   │
   ▼
Amazon ECR
   │
   ▼
ECR Security Scan
   │
   ▼
AWS CodePipeline
   │
   ├────► Development
   │
   └────► Production
```

---

# Security Controls

## Authentication

- Microsoft Entra ID SSO
- MFA Support
- OAuth 2.0

## Authorization

- Role-Based Access Control
- Least Privilege Access

## Data Protection

- Encryption at Rest
- Encryption in Transit
- KMS Managed Keys

## Monitoring

- CloudWatch Monitoring
- CloudTrail Audit Logging
- AWS Config Compliance Tracking

---

# Environments

| Environment | Purpose |
|-------------|----------|
| Development | Development Activities |
| SIT | System Integration Testing |
| UAT | User Acceptance Testing |
| Production | Live Environment |

---

# API Modules

## Authentication APIs

```http
POST /api/v1/auth/login
POST /api/v1/auth/logout
```

## Campaign APIs

```http
GET  /api/v1/campaigns
POST /api/v1/campaigns
PUT  /api/v1/campaigns/{id}
```

## Training APIs

```http
GET  /api/v1/trainings
POST /api/v1/trainings/assign
GET  /api/v1/trainings/progress
```

## Quiz APIs

```http
GET  /api/v1/quizzes
POST /api/v1/quizzes/submit
```

## Analytics APIs

```http
GET /api/v1/dashboard
GET /api/v1/reports
```

---

# Branching Strategy

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
feat(training): add learning module
```

---

# Future Enhancements

- AI-Based Quiz Generation
- Personalized Learning Paths
- SCORM Support
- Certificate Generation
- Mobile Application
- Predictive Risk Analytics

---

# Contributors

Security Awareness Platform Team

---

# License

Proprietary Software

All Rights Reserved.
