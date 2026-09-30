# Cost estimate — target architecture

Monthly AWS running cost for the target architecture in
[`architecture.png`](architecture.png) (Figure 1 in the README), sized for an
enterprise-grade production deployment.

> **Read this first.** These are planning estimates, not a quote.
> - Unit prices are AWS public list prices for **ap-south-1 (Mumbai)**, rounded.
>   Check them in the [AWS Pricing Calculator](https://calculator.aws/) before
>   using the numbers in a budget request. AWS changes prices from time to time.
> - The final region is not decided yet. Another region changes the totals by
>   roughly ±10–20%.
> - Figures **exclude taxes** (AWS India invoices carry 18% GST) and any
>   enterprise discount (EDP or private pricing) Vodafone may have.
> - INR figures use an assumed **₹85 = US$1**.

---

## 1. Workload assumptions

| Driver | Baseline | Scale-up |
|---|---:|---:|
| Employees in scope | 30,000 | 3,00,000 |
| Admins / campaign operators | ~50 | ~200 |
| Quarterly all-staff simulation | 30,000 emails | 3,00,000 emails |
| Monthly targeted simulations | 5,000–6,000 emails | 50,000–60,000 emails |
| Emails sent — average month | ~16,000 | ~1,60,000 |
| Emails sent — peak month (quarterly + monthly) | ~36,000 | ~3,60,000 |
| Training content served (SCORM, via CloudFront) | ~300 GB / month | ~3 TB / month |
| API requests (app, LMS, link tracking) | ~6 M / month | ~60 M / month |
| Lambda invocations | ~6 M / month | ~60 M / month |
| DynamoDB writes / reads | ~1 M / ~5 M | ~10 M / ~50 M |
| Data stored (S3, all buckets) | ~100 GB | ~800 GB |
| DynamoDB table storage | ~5 GB | ~50 GB |

The monthly volume at scale assumes the same share of targeted campaigns (about
20% of staff per month). Each employee is assumed to complete about one ~30 MB
course a quarter; this drives CloudFront transfer.

---

## 2. Production environment — monthly cost by service

All prices are US$. **Baseline** is 30,000 users; **Scale** is 3,00,000 users.

### Edge and delivery

| Service | Unit price used | Baseline | Scale |
|---|---|---:|---:|
| Amazon CloudFront | $0.109/GB (India) + $0.012 per 10k HTTPS requests | 37 | 363 |
| AWS WAF | $5 per web ACL + $1 per rule + $0.60 per M requests | 19 | 51 |
| Amazon Route 53 | $0.50 per hosted zone + $0.40 per M queries | 1 | 3 |
| AWS Certificate Manager | Public certificates are free | 0 | 0 |

### Application

| Service | Unit price used | Baseline | Scale |
|---|---|---:|---:|
| API Gateway (HTTP API) | $1.00 per M requests | 6 | 60 |
| AWS Lambda (512 MB, ~200 ms avg) | $0.20 per M requests + $0.0000166667 per GB-s | 11 | 112 |
| Amazon SQS | $0.40 per M requests (first 1 M free) | 0 | 1 |
| Amazon SES | $0.10 per 1,000 emails | 2 | 16 |
| EventBridge Scheduler | 14 M invocations free (~240 used) | 0 | 0 |

### Network (Multi-AZ VPC)

| Service | Unit price used | Baseline | Scale |
|---|---|---:|---:|
| NAT Gateway × 2 (one per AZ) | $0.056/hour + $0.056/GB processed | 82 | 83 |
| Interface endpoints (SES, SQS, Secrets Manager, Athena) × 2 AZs | $0.013/hour per endpoint per AZ + $0.01/GB | 76 | 77 |
| Gateway endpoints (DynamoDB, S3) | Free | 0 | 0 |

### Data, ETL and analytics

| Service | Unit price used | Baseline | Scale |
|---|---|---:|---:|
| Amazon DynamoDB (on-demand, PITR on) | ~$0.71 per M writes, ~$0.14 per M reads, $0.285/GB, PITR $0.228/GB | 4 | 40 |
| Amazon S3 (origins, app data, raw, curated, query results) | $0.025/GB + request charges | 4 | 28 |
| AWS Glue (daily ETL + crawler) | $0.44 per DPU-hour | 5 | 20 |
| Amazon Athena (summary tables, cached results) | $5 per TB scanned | 1 | 5 |

### Security, governance and observability

| Service | Unit price used | Baseline | Scale |
|---|---|---:|---:|
| AWS Secrets Manager | $0.40 per secret + $0.05 per 10k calls | 2 | 2 |
| AWS KMS (customer-managed keys) | $1 per key + $0.03 per 10k requests | 6 | 10 |
| Amazon CloudWatch (logs, metrics, alarms, dashboards) | ~$0.60/GB log ingestion + alarms/dashboards | 15 | 80 |
| AWS X-Ray (sampled tracing) | $5 per M traces (first 100k free) | 1 | 10 |
| AWS CloudTrail | First management trail free; log storage in S3 | 3 | 8 |
| AWS Config | $0.003 per configuration item + $0.001 per rule evaluation | 12 | 20 |
| Amazon GuardDuty (incl. S3 Malware Protection) | Event and log volume + $0.60/GB scanned | 27 | 100 |
| AWS Backup | ~$0.10/GB-month (DynamoDB), ~$0.05/GB-month (S3) | 4 | 35 |

### Production total

| | Baseline | Scale |
|---|---:|---:|
| **Production, per month** | **≈ $320** | **≈ $1,125** |

---

## 3. Full monthly and annual cost

| Line | Baseline | Scale |
|---|---:|---:|
| Production (section 2) | $320 | $1,125 |
| Non-production environment (dev/test: single AZ, one NAT, smaller volumes) | $110 | $150 |
| AWS Business Support (greater of $100 or ~10% of usage) | $100 | $130 |
| **Total per month (US$)** | **≈ $530** | **≈ $1,405** |
| **Total per year (US$)** | **≈ $6,360** | **≈ $16,860** |
| Total per month (₹, before GST) | ≈ ₹45,000 | ≈ ₹1.19 lakh |
| **Total per year (₹, before GST)** | **≈ ₹5.4 lakh** | **≈ ₹14.3 lakh** |
| Total per year (₹, with 18% GST) | ≈ ₹6.4 lakh | ≈ ₹16.9 lakh |
| Cost per employee per year | ≈ $0.21 (₹18) | ≈ $0.06 (₹5) |

**Optional add-ons, not in the totals:**
- **SES dedicated IP:** about $25 a month. Worth considering at scale for sender reputation.
- **WAF Bot Control:** $10 a month plus $1 per M requests.
- **AWS Enterprise Support:** replaces Business Support if Vodafone already has an enterprise agreement.

---

## 4. What drives the cost

- **Fixed network cost is about half of the baseline bill.** The NAT Gateways and
  interface endpoints (about $160 a month) cost the same whether we have 30,000 users or
  3,00,000. That is the price of keeping every Lambda in private subnets. The
  options for lowering it, each with a security trade-off to review with SPDA:
  - Non-production can run on a single NAT and a single AZ (already assumed above).
  - Services with low traffic can route through the NAT instead of their own
    interface endpoint.
- **CloudFront transfer of training content is the main cost at scale.**
  About a quarter of the scale-up bill is course delivery. To reduce it:
  - Compress SCORM media and use adaptive-bitrate video.
  - Set long cache lifetimes on published course files.
- **Email is cheap.** Even the peak month at scale (about 3,60,000 simulations) costs
  about $36 in SES.
- **Analytics stays cheap.** Glue writes small summary tables and chart results
  are cached, so Athena scans very little data.
- **Everything else is pay-per-use serverless.** Lambda, API Gateway, DynamoDB
  and SQS scale with usage and have no idle cost.

---

## 5. Not included

- **Microsoft 365:** Outlook, the reporting mailbox, Power Automate (standard
  connectors) and SharePoint. These are covered by existing Microsoft 365 / Entra ID
  licences.
- **Other tools and costs:** domain registration, GitHub, SonarQube, and people
  or support effort.
- **Today's proof of concept:** it runs almost entirely inside the AWS free tier
  (no VPC, NAT, WAF or CloudFront yet), so its current bill is a few dollars a month.
