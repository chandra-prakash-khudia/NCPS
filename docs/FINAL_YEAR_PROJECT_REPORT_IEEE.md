# Network-aware Credibility and Propagation System for Local News Verification

**A Final Year Project Report**  
submitted in partial fulfillment of the requirements for the award of the degree of

**Bachelor of Technology**  
in  
**Computer Science and Engineering**

by

**[Student Name]**  
**[Roll Number]**

under the guidance of

**[Guide Name]**  
**[Designation]**

Department of Computer Science and Engineering  
**[Institute/University Name]**  
**[City, State, Country]**

**May 2026**

---

## Certificate

This is to certify that the project report entitled **"Network-aware Credibility and Propagation System for Local News Verification"** submitted by **[Student Name] ([Roll Number])** to the Department of Computer Science and Engineering, **[Institute/University Name]**, in partial fulfillment of the requirements for the award of the degree of Bachelor of Technology in Computer Science and Engineering, is a bona fide record of work carried out under my supervision.

The work presented in this report has been reviewed and is suitable for submission as a final year engineering project report.

**[Guide Name]**  
Project Supervisor  
Department of Computer Science and Engineering  
**[Institute/University Name]**

Date: **[Date]**  
Place: **[Place]**

---

## Student Declaration

I declare that this project report titled **"Network-aware Credibility and Propagation System for Local News Verification"** is a record of original project work carried out by me under the supervision of **[Guide Name]**. The matter presented in this report has not been submitted, either in full or in part, to any other institute or university for the award of any degree or diploma.

I also declare that the report has been prepared in my own words based on the project implementation, system documentation, experiments, and cited references. All external sources used for background study have been acknowledged in IEEE reference style.

**[Student Name]**  
**[Roll Number]**

Date: **[Date]**  
Place: **[Place]**

---

## Acknowledgement

I express my sincere gratitude to **[Guide Name]**, **[Designation]**, Department of Computer Science and Engineering, **[Institute/University Name]**, for providing guidance, encouragement, and constructive feedback throughout the development of this project. The direction received during system design, algorithm formulation, implementation, and report preparation helped shape the work into a complete engineering project.

I am also thankful to the Department of Computer Science and Engineering for providing the academic environment and resources required to complete this project. I extend my thanks to my classmates, friends, and family members for their support and motivation during the course of this work.

**[Student Name]**

---

## Abstract

The rapid flow of information through online and local digital platforms has made news distribution faster, but it has also increased the risk of false, misleading, or unverified information spreading before reliable confirmation is available. Traditional engagement-based ranking systems often reward popularity rather than credibility, which can allow coordinated users, bots, and low-quality accounts to amplify unreliable content. This project presents **NCPS: Network-aware Credibility and Propagation System**, a trust-aware platform for estimating the credibility of local news reports and controlling their propagation based on user reliability, behavioral signals, graph trust, spatial confidence, and machine learning support.

The system models users, posts, votes, locations, and interaction graphs as continuously updated states. Each user receives a dynamic weight computed from effective reliability, experience, anomaly score, graph trust, and location confidence. Post credibility is estimated using trust-weighted Bayesian aggregation, disagreement variance, urgency scoring, and optional machine learning and memory-based augmentation. Propagation and alerting decisions are made only when credibility, evidence mass, variance, spatial trust, and urgency satisfy defined thresholds.

The implemented system includes a FastAPI backend, PostgreSQL persistence, Redis/Kafka-ready architecture, simulation modules, a React-based user interface, account authentication, profile and trust dashboards, map-based visualization, report creation, voting, and phase-wise evaluation. Experimental simulation under adversarial settings shows improvement from Phase 1 to the full Phase 6 pipeline, with accuracy increasing from 0.900 to 1.000, attack success reducing from 0.150 to 0.000, and anomaly recall improving from 0.000 to 0.840. The project demonstrates that credibility-driven propagation can be a practical alternative to engagement-driven news distribution for local information systems.

**Keywords:** Credibility estimation, fake news detection, trust propagation, graph-based trust, local news verification, Bayesian aggregation, anomaly detection, spatial trust, FastAPI, React.

### Implemented Product Extensions

The final user-facing implementation includes the following deployment-oriented extensions while preserving the original credibility algorithm:

- Google authentication and account linking in addition to email/password login.
- Category-based feed filtering, a global feed, and a map explorer for geographic browsing.
- Hyperlocal alerts within a 1 km neighborhood, an alert inbox, real-time Server-Sent Event delivery, and Web Push subscription storage.
- Explainable AI traces showing credibility components, vote-weight contributions, propagation conditions, alert conditions, and proximity checks.
- City leaderboard, trust badges, daily/weekly streaks, bookmarks, share tracking, and suspicious-content reporting.
- Observability endpoints and dashboard cards for health, latency, request classes, and product-event counts.
- Mobile-friendly UI refinements using a restrained local-news product design.

---

## Table of Contents

| Section | Title |
|---|---|
| Certificate | Certificate |
| Declaration | Student Declaration |
| Acknowledgement | Acknowledgement |
| Abstract | Abstract |
| List of Figures | List of Figures |
| List of Tables | List of Tables |
| Abbreviations | Abbreviations and Notations |
| Chapter 1 | Introduction |
| Chapter 2 | Literature Survey |
| Chapter 3 | Proposed Methodology |
| Chapter 4 | Implementation |
| Chapter 5 | Results and Discussion |
| Chapter 6 | Conclusion and Future Scope |
| References | IEEE Style References |
| Appendix A | API Endpoints |
| Appendix B | Setup and Execution |

---

## List of Figures

| Figure | Title |
|---|---|
| Fig. 1.1 | Engagement-driven versus credibility-driven news flow |
| Fig. 1.2 | Problem scenario in local news verification |
| Fig. 3.1 | Overall NCPS architecture |
| Fig. 3.2 | Event processing and state update flow |
| Fig. 3.3 | User weight computation pipeline |
| Fig. 3.4 | Post credibility computation pipeline |
| Fig. 3.5 | Graph trust and coordination detection overview |
| Fig. 3.6 | Spatial trust and propagation decision workflow |
| Fig. 4.1 | Database schema overview |
| Fig. 4.2 | Authentication and protected request flow |
| Fig. 4.3 | React frontend page flow |
| Fig. 5.1 | Phase-wise accuracy comparison |
| Fig. 5.2 | Phase-wise attack success comparison |
| Fig. 5.3 | Phase-wise anomaly recall comparison |

---

## List of Tables

| Table | Title |
|---|---|
| Table 2.1 | Summary of literature survey |
| Table 3.1 | Input signals used in NCPS |
| Table 3.2 | System phases and contribution |
| Table 4.1 | Backend technology stack |
| Table 4.2 | Frontend technology stack |
| Table 5.1 | Simulation configuration |
| Table 5.2 | Phase-wise experimental results |
| Table 5.3 | Functional test scenarios |

---

## Abbreviations and Notations

### Abbreviations

| Term | Meaning |
|---|---|
| API | Application Programming Interface |
| CORS | Cross-Origin Resource Sharing |
| GNN | Graph Neural Network |
| GPS | Global Positioning System |
| HTTP | Hypertext Transfer Protocol |
| JWT | JSON Web Token |
| ML | Machine Learning |
| NCPS | Network-aware Credibility and Propagation System |
| ORM | Object Relational Mapping |
| PWA | Progressive Web Application |
| REST | Representational State Transfer |
| SQL | Structured Query Language |
| UI | User Interface |
| UUID | Universally Unique Identifier |

### Notations

| Notation | Description |
|---|---|
| \(R_i\) | Reliability score of user \(i\) |
| \(R_i^*\) | Effective reliability after confidence adjustment |
| \(Exp_i\) | Experience score of user \(i\) |
| \(Anom_i\) | Anomaly score of user \(i\) |
| \(T_i\) | Trust score of user \(i\) |
| \(L_i\) | Location confidence of user \(i\) |
| \(w_i\) | Final influence weight of user \(i\) |
| \(C_j\) | Credibility score of post \(j\) |
| \(C_{Bayes}\) | Bayesian credibility estimate |
| \(N_j\) | Effective evidence mass for post \(j\) |
| \(Var_j\) | Voter disagreement variance for post \(j\) |
| \(U_j\) | Urgency score of post \(j\) |
| \(r_j\) | Current propagation radius of post \(j\) |

---

# Chapter 1: Introduction

## 1.1 Background

Digital news circulation has changed the way people receive local information. Incidents such as traffic disruption, public safety alerts, civic issues, weather warnings, and emergency events are often first reported by ordinary users. This creates a useful channel for community awareness, but it also creates a serious verification problem. A report may be useful, exaggerated, incomplete, repeated, or intentionally false. If a system distributes every report based only on likes, shares, or speed of engagement, unreliable information can spread faster than verified information.

Research on online misinformation shows that false information can travel widely through social networks, and that detection is difficult when only textual content is used [1], [2]. News credibility depends not only on what is written, but also on who reports it, how other users respond, how the information spreads, and whether the report is locally plausible. For this reason, credibility estimation requires a combination of content signals, user behavior, social graph structure, timing, and spatial evidence.

NCPS is designed around this idea. Instead of treating all users and votes equally, the system computes a dynamic trust weight for each user. A vote from a consistent, experienced, non-anomalous, and location-plausible user contributes more than a vote from a new, suspicious, or coordinated user. Similarly, post propagation is not based on engagement alone. The system expands the reach of a report only when credibility is high, disagreement is low, and enough evidence is available.

**[Insert Fig. 1.1: Engagement-driven versus credibility-driven news flow]**

## 1.2 Motivation

The motivation for this project comes from the gap between fast local reporting and reliable local verification. In many real situations, waiting for official confirmation can delay useful alerts. At the same time, blindly spreading user-generated claims can create confusion and panic. A practical local news system should therefore support rapid reporting while still applying trust-aware control.

The project is motivated by the following observations:

- Local incidents are often reported before they appear in formal news channels.
- Popularity is not the same as credibility.
- Malicious users can coordinate to manipulate voting systems.
- New accounts should not immediately receive the same influence as proven accounts.
- Location context matters for local news propagation.
- A transparent scoring system is useful for both users and administrators.

## 1.3 Problem Statement

The problem addressed in this project is:

**To design and implement a network-aware credibility and propagation system that can estimate the trustworthiness of user-generated local news reports, resist coordinated manipulation, and control information spread using user reliability, graph trust, anomaly detection, spatial confidence, and machine learning support.**

**[Insert Fig. 1.2: Problem scenario in local news verification]**

## 1.4 Objectives

The major objectives of the project are:

1. To create a user-facing platform where authenticated users can report local news and vote on credibility.
2. To compute user influence using reliability, experience, anomaly, graph, and location signals.
3. To estimate post credibility through trust-weighted Bayesian aggregation.
4. To detect suspicious behavior such as burst activity, coordination, low entropy, and location inconsistency.
5. To control propagation radius based on credibility, evidence, variance, and spatial trust.
6. To provide a dashboard and map interface for viewing credibility, trust, and location-aware reports.
7. To evaluate the system under clean, noisy, and adversarial simulation conditions.
8. To make the application deployment-ready through authentication and PostgreSQL persistence.

## 1.5 Scope of the Project

The project covers both algorithmic and application-level development. On the algorithmic side, it includes credibility scoring, user trust modeling, anomaly detection, graph trust propagation, spatial confidence, and simulation-based evaluation. On the application side, it includes backend APIs, database models, authentication, React frontend pages, map visualization, and profile dashboards.

The scope is limited to local news credibility estimation and controlled simulation. The system does not claim to replace professional fact-checking. Instead, it provides a trust-aware early credibility layer that can prioritize reliable reports and reduce the impact of manipulation.

## 1.6 Organization of the Report

This report is organized into six chapters. Chapter 1 introduces the background, motivation, problem statement, and objectives. Chapter 2 presents the literature survey. Chapter 3 describes the proposed methodology and mathematical model. Chapter 4 explains implementation details. Chapter 5 presents results and discussion. Chapter 6 concludes the report and outlines future work.

---

# Chapter 2: Literature Survey

## 2.1 Overview

Misinformation detection has been studied through multiple approaches, including content-based classification, user-behavior analysis, propagation modeling, source credibility estimation, and graph-based learning. Early approaches focused mainly on textual features, but later research showed that social context and user response patterns are also important [2], [3]. NCPS builds on these directions by combining crowd signals, user trust, graph coordination, and location confidence in a single system.

## 2.2 Content-Based Fake News Detection

Content-based methods attempt to classify news by analyzing the text, linguistic patterns, topic, sentiment, or semantic meaning of the article. These methods are useful when false content has recognizable textual features. However, they may fail when a false report is short, copied from a real source, or written in a neutral style. In local news reporting, content is often brief and informal, so text alone is not sufficient.

Shu et al. presented fake news detection as a data mining problem and emphasized that social media news differs from traditional news because auxiliary information such as user engagement and network behavior is often required [2]. This idea supports the NCPS design decision to include user and propagation signals instead of relying only on post content.

## 2.3 User Response and Source-Based Detection

Ruchansky et al. proposed a hybrid model that considered article content, user response, and source characteristics [3]. Their work is important because it treats fake news detection as a multi-signal problem rather than a purely textual classification task. NCPS follows a similar principle but adapts it to local news verification by explicitly assigning weights to users based on trust and behavior.

In NCPS, the source is not only the original author of a report. Every voter also becomes a source of evidence. Therefore, the system must estimate how much influence each user should have. This is handled using reliability, experience, anomaly, graph trust, and location confidence.

## 2.4 Propagation-Based and Graph-Based Detection

Propagation-based methods study how information moves through a network. False information may show unusual spread patterns, synchronized voting, or clustered amplification. Graph neural networks and graph-based models have been used for rumor and fake news detection because they can capture relationships between users, posts, and interactions [4], [5].

Bian et al. introduced a bi-directional graph convolutional model for rumor detection that considers both top-down and bottom-up propagation patterns [4]. Monti et al. showed that social network structure and propagation features can improve fake news detection [5]. NCPS uses graph concepts in a simpler and more interpretable way: users who interact on the same posts form weighted edges, and trust is propagated through normalized relationships.

## 2.5 Truth Discovery and Source Reliability

Truth discovery methods estimate both the truthfulness of claims and the reliability of sources. Yin et al. proposed TruthFinder, where source reliability and claim confidence influence each other iteratively [6]. This is closely related to the NCPS philosophy. In NCPS, reliable users raise the credibility of posts, and user reliability is updated based on past correctness.

The difference is that NCPS also includes temporal decay, anomaly penalties, graph coordination, spatial confidence, and propagation decisions. This makes it more suitable for local news scenarios where timing and location matter.

## 2.6 Misinformation Spread in Social Networks

Vosoughi et al. studied the spread of true and false news online and showed that false news can diffuse widely through social media networks [1]. Their work highlights the need for early intervention in information propagation. NCPS directly addresses this by controlling propagation radius rather than allowing every post to spread freely.

In the proposed system, a post begins with limited local reach. It expands only when credibility and evidence conditions are satisfied. This design aims to reduce the chance that false information becomes widely visible before enough verification is available.

## 2.7 Summary of Literature Survey

**Table 2.1: Summary of literature survey**

| Ref. | Approach | Key Idea | Relevance to NCPS |
|---|---|---|---|
| [1] | Empirical misinformation spread | False news can spread widely and quickly | Supports need for propagation control |
| [2] | Data mining survey | Fake news requires content and social context | Supports multi-signal design |
| [3] | Hybrid fake news model | Uses content, response, and source | Supports user-response modeling |
| [4] | Graph convolution for rumors | Models propagation direction | Supports graph-aware detection |
| [5] | Geometric deep learning | Combines content, user, graph, propagation | Supports heterogeneous signal fusion |
| [6] | Truth discovery | Estimates source reliability and claim truth | Supports iterative trust-credibility relation |

## 2.8 Research Gap

The literature shows that fake news detection benefits from multiple signal categories. However, many systems focus on post-level classification after content has already spread. Some models are also difficult to interpret because they depend heavily on deep learning. NCPS addresses this gap through a transparent, modular, and local-first system that combines weighted crowd verification, trust propagation, anomaly detection, and spatial filtering before expanding information reach.

---

# Chapter 3: Proposed Methodology

## 3.1 System Overview

NCPS is a credibility-driven information propagation system. The system receives user actions such as report creation, voting, and location updates. These actions update user state, post state, graph state, and location state. The final output is a credibility-ranked feed, propagation decision, alert decision, and trust profile.

The system is divided into six progressive phases:

- Phase 1: Base Bayesian credibility.
- Phase 2: User-aware reliability, experience, and anomaly.
- Phase 3: Graph trust and coordination detection.
- Phase 4: Spatial trust and location confidence.
- Phase 5: Machine learning and memory augmentation.
- Phase 6: Extended behavioral signals such as device, IP, session, timing, and navigation consistency.

**[Insert Fig. 3.1: Overall NCPS architecture]**

## 3.2 Input Data and Events

The system processes three main event types:

1. **Post event:** A user submits a local news report with optional latitude and longitude.
2. **Vote event:** A user votes whether a post appears credible or fake.
3. **Location event:** A user updates current location for spatial relevance and confidence.

Each event contains a user identifier, timestamp, event type, and event-specific payload. The event-driven design allows the system to update credibility incrementally as new actions arrive.

**[Insert Fig. 3.2: Event processing and state update flow]**

## 3.3 User State Computation

Each user is represented by a state vector containing reliability, experience, anomaly score, trust score, location confidence, and final influence weight.

### 3.3.1 Effective Reliability

The reliability of a user is estimated using a Bayesian ratio of correct and incorrect actions:

\[
R_i(t)=\frac{\alpha_i(t)}{\alpha_i(t)+\beta_i(t)}
\]

where \(\alpha_i(t)\) is the time-decayed count of correct actions and \(\beta_i(t)\) is the time-decayed count of incorrect actions.

To avoid overconfidence for users with few actions, a confidence term is added:

\[
Conf_i(t)=1-e^{-k(\alpha_i(t)+\beta_i(t))}
\]

The final effective reliability is:

\[
R_i^*(t)=R_i(t)\cdot Conf_i(t)
\]

This ensures that new users do not immediately receive high influence.

### 3.3.2 Experience Score

Experience is computed from the accumulated activity of a user:

\[
Exp_i(t)=\frac{\log(1+E_i(t))}{\log(1+E_{max})}
\]

The logarithmic form gives diminishing returns. A highly active user gains experience, but cannot dominate the system only through volume.

### 3.3.3 Anomaly Score

The anomaly score measures suspicious behavior. It is based on deviation signals such as burst voting, low entropy voting, disagreement with consensus, coordination, and location inconsistency:

\[
Anom_i(t)=1-e^{-\sum_k \alpha_kD_k}
\]

A higher anomaly score reduces user influence.

### 3.3.4 Final User Weight

The final user weight is:

\[
w_i(t)=T_i(t)\cdot(1-Anom_i(t))\cdot Exp_i(t)
\]

This multiplicative formula ensures that trust, normal behavior, and experience are all required for meaningful influence.

**[Insert Fig. 3.3: User weight computation pipeline]**

## 3.4 Post Credibility Computation

Each post receives positive and negative weighted evidence from user votes. Positive evidence is:

\[
S_j^+=\sum_{i:v_i=+1} w_i e^{-\lambda(t-t_i)}
\]

Negative evidence is:

\[
S_j^-=\sum_{i:v_i=-1} w_i e^{-\lambda(t-t_i)}
\]

The effective evidence mass is:

\[
N_j=S_j^+ + S_j^-
\]

The Bayesian credibility score is:

\[
C_{Bayes}=\frac{\alpha_0+S_j^+}{\alpha_0+\beta_0+S_j^+ + S_j^-}
\]

The final credibility score can include machine learning and memory-based augmentation:

\[
C_{final}=(1-\alpha-\gamma)C_{Bayes}+\alpha C_{ML}+\gamma C_{memory}
\]

The system also computes variance:

\[
Var_j=\frac{\sum_i w_i(v_i-C_j)^2}{\sum_i w_i}
\]

Variance is important because a highly disputed post should not propagate aggressively even if its average score appears moderate.

**[Insert Fig. 3.4: Post credibility computation pipeline]**

## 3.5 Graph Trust and Coordination

Users who interact with the same posts are connected in a graph. Edge weights are computed from agreement score, time similarity, and interaction frequency:

\[
A_{ij}=w_1Agree_{ij}+w_2TimeSim_{ij}+w_3Freq_{ij}
\]

After normalization, trust propagation is performed:

\[
T^{next}=\lambda_g A_{norm}T+(1-\lambda_g)R^*
\]

This allows the system to use network structure while still anchoring trust in individual reliability. Coordinated groups can also be detected when multiple users vote in similar ways within short time windows.

**[Insert Fig. 3.5: Graph trust and coordination detection overview]**

## 3.6 Spatial Trust and Propagation

Local news is location-sensitive. A report about a road closure, fire, flood, or public event is most relevant to users near that location. NCPS uses location confidence and proximity to improve propagation decisions.

Location confidence is based on GPS plausibility, movement continuity, source quality, and speed constraints. Proximity is computed from the distance between user and post locations. The propagation decision considers:

- final credibility;
- effective evidence mass;
- variance;
- post age;
- current radius;
- contributor location confidence.

A post expands only when these conditions meet the threshold values.

**[Insert Fig. 3.6: Spatial trust and propagation decision workflow]**

## 3.7 Input Signals

**Table 3.1: Input signals used in NCPS**

| Signal | Description | Purpose |
|---|---|---|
| Effective reliability | Correctness history with confidence | Rewards consistent users |
| Experience | Log-normalized action history | Reduces impact of new accounts |
| Burst deviation | Sudden action rate increase | Detects automation |
| Entropy deviation | Repetitive vote behavior | Detects scripted voting |
| Consensus deviation | Persistent disagreement with reliable outcomes | Detects manipulative voting |
| Coordination score | Similarity between user groups | Detects group attacks |
| Location inconsistency | Implausible movement or spoofing | Improves spatial trust |
| Graph trust | Network propagated trust | Uses social structure |
| Location confidence | Quality of location evidence | Supports local propagation |
| Navigation deviation | Movement path abnormality | Detects non-human patterns |
| Device consistency | Device identity stability | Detects shared/bot accounts |
| IP consistency | Network-location consistency | Detects suspicious access |
| Session continuity | Human-like session pattern | Detects automation |
| Vote timing | Inter-vote timing variance | Detects synchronized behavior |

## 3.8 System Phases

**Table 3.2: System phases and contribution**

| Phase | Main Components | Contribution |
|---|---|---|
| Phase 1 | Bayesian credibility | Establishes base weighted truth estimate |
| Phase 2 | Reliability, experience, anomaly | Reduces low-quality user influence |
| Phase 3 | Graph trust | Detects coordination and propagates trust |
| Phase 4 | Spatial trust | Adds location confidence and proximity |
| Phase 5 | ML and memory | Improves early credibility estimation |
| Phase 6 | Extended behavioral signals | Strengthens bot and manipulation detection |

---

# Chapter 4: Implementation

## 4.1 Technology Stack

The project is implemented as a full-stack system with a Python backend and a React frontend.

**Table 4.1: Backend technology stack**

| Component | Technology |
|---|---|
| API framework | FastAPI |
| Database ORM | SQLAlchemy |
| Production database | PostgreSQL |
| Migration tool | Alembic |
| Cache layer | Redis-ready |
| Event stream | Kafka-ready |
| Simulation | Python, NumPy, scikit-learn |
| Testing | Pytest |

**Table 4.2: Frontend technology stack**

| Component | Technology |
|---|---|
| UI framework | React |
| Build tool | Vite |
| UI components | Material UI |
| Routing | React Router |
| HTTP client | Axios |
| Map | Leaflet |
| Notifications | React Toastify |

## 4.2 Backend Architecture

The backend is divided into production API modules, user-facing webapp modules, database models, algorithm engines, and simulation modules. The core algorithm files are located under `backend/app/engine/`. These files implement the trust, graph, spatial, urgency, ML, and decision logic. The user-facing webapp provides authenticated API routes for real users.

The production persistence layer includes:

- `users` table for algorithmic user state;
- `auth_accounts` table for login information;
- `posts` table for report content and credibility state;
- `interactions` table for votes;
- `user_locations` table for location history;
- graph and alert-related tables for future expansion.

**[Insert Fig. 4.1: Database schema overview]**

## 4.3 Authentication and Account Persistence

The system supports multi-user authentication. Passwords are stored as salted PBKDF2-SHA256 hashes. Access tokens are HMAC-signed bearer tokens. The authentication data is kept in a separate table from the algorithmic user state to avoid mixing login information with trust computation fields.

The protected routes include report creation, voting, location update, profile state, and activity history. A user cannot submit a vote on behalf of another user because the backend uses the authenticated token subject as the acting user.

**[Insert Fig. 4.2: Authentication and protected request flow]**

## 4.4 Database Persistence

Earlier demo versions used in-memory storage for user-facing interactions. The current implementation uses PostgreSQL-backed persistence. This means accounts, reports, votes, locations, credibility scores, and activity records survive server restart. Alembic migrations are used to create and update the schema safely during deployment.

The webapp fails at startup if the database or required schema is unavailable. This is suitable for production because silent fallback to memory can lead to data loss.

## 4.5 API Endpoints

The main API endpoints are:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/post/create`
- `POST /api/post/vote`
- `GET /api/feed`
- `GET /api/post/{post_id}`
- `POST /api/user/location`
- `GET /api/user/me/state`
- `GET /api/user/me/activity`

These endpoints provide the necessary interface for report creation, credibility voting, personalized profile display, and feed generation.

## 4.6 Frontend Implementation

The React frontend provides the user interface for the NCPS platform. It includes:

- login and registration pages;
- home feed with credibility-ranked reports;
- report creation form;
- post detail page with credibility breakdown;
- map page with location markers;
- profile page with trust decomposition and recent activity;
- navigation bar with account menu and logout.

**[Insert Fig. 4.3: React frontend page flow]**

## 4.7 Deployment Setup

For deployment, PostgreSQL is required. The database URL is provided through environment variables. Migrations are applied before starting the webapp:

```bash
export NCPS_WEBAPP_DATABASE_URL="postgresql+psycopg2://user:password@host:5432/ncps"
python -m alembic upgrade head
python -m webapp.server
```

The React frontend can be built using:

```bash
npm run build
```

---

# Chapter 5: Results and Discussion

## 5.1 Experimental Setup

The system was evaluated using the simulation runner included in the backend. The simulation generates synthetic users, posts, and interactions under adversarial conditions. Different phases are compared to observe how each added signal improves robustness.

**Table 5.1: Simulation configuration**

| Parameter | Value |
|---|---|
| Users | 70 |
| Posts | 50 |
| Interactions | 1000 |
| Scenario | Attack simulation and honest baseline |
| Compared phases | Phase 1, Phase 3, Phase 4, Phase 5, Phase 6 |

## 5.2 Evaluation Metrics

The following metrics are used:

- **Accuracy:** fraction of correctly classified posts.
- **Attack Success:** fraction of false posts incorrectly accepted as true.
- **Brier Score:** calibration error between predicted credibility and ground truth.
- **Weight Correlation:** correlation between computed user weight and true reliability.
- **Anomaly Precision:** fraction of detected anomalous users that are truly anomalous.
- **Anomaly Recall:** fraction of anomalous users detected by the system.

## 5.3 Phase-wise Results

**Table 5.2: Phase-wise experimental results**

| Metric | Phase 1 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|---|---:|---:|---:|---:|---:|
| Accuracy | 0.900 | 0.920 | 0.920 | 1.000 | 1.000 |
| Attack Success | 0.150 | 0.150 | 0.150 | 0.000 | 0.000 |
| Brier Score | 0.212 | 0.221 | 0.221 | 0.153 | 0.153 |
| Weight Correlation | 0.332 | 0.410 | 0.410 | 0.420 | 0.470 |
| Anomaly Precision | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| Anomaly Recall | 0.000 | 0.480 | 0.680 | 0.800 | 0.840 |

**[Insert Fig. 5.1: Phase-wise accuracy comparison]**

**[Insert Fig. 5.2: Phase-wise attack success comparison]**

**[Insert Fig. 5.3: Phase-wise anomaly recall comparison]**

## 5.4 Discussion

The results show that the basic Bayesian model already performs reasonably well, with an accuracy of 0.900. However, it still allows an attack success rate of 0.150 and does not detect anomalous users. This indicates that simple weighted credibility estimation is not sufficient under adversarial conditions.

Phase 3 introduces graph trust and coordination-aware modeling. Accuracy improves from 0.900 to 0.920, and anomaly precision reaches 1.000. This means the detected suspicious users are highly likely to be truly suspicious. However, anomaly recall is only 0.480, meaning many anomalous users are still missed.

Phase 4 adds spatial trust. Accuracy remains stable, but anomaly recall improves from 0.480 to 0.680. This shows that location-related evidence helps detect suspicious behavior that graph signals alone may not capture.

Phase 5 introduces machine learning and memory augmentation. Accuracy reaches 1.000 and attack success drops to 0.000. This shows that combining crowd evidence with learned and historical signals improves robustness under the simulated attack scenario.

Phase 6 adds extended behavioral signals such as device, IP, session, timing, and navigation consistency. Accuracy remains 1.000, attack success remains 0.000, and anomaly recall improves further to 0.840. This indicates that extended signals mainly strengthen adversarial-user detection and user weight quality.

## 5.5 Functional Testing

**Table 5.3: Functional test scenarios**

| Test Scenario | Expected Result | Status |
|---|---|---|
| User registration | Account and linked user created | Passed |
| User login | Valid token returned | Passed |
| Protected post creation | Post created under authenticated user | Passed |
| Duplicate voting | Second vote rejected | Passed |
| Feed retrieval | Persisted posts returned | Passed |
| Profile state | Trust and activity shown | Passed |
| Database startup validation | Fails when schema is missing | Passed |
| React build | Frontend builds successfully | Passed |

## 5.6 Limitations

The current system is evaluated mainly using simulation. Real-world deployment would require larger datasets, live moderation feedback, and continuous threshold calibration. The machine learning component is designed as an augmentation layer, not as the only decision maker. Also, privacy and safety policies must be strengthened before large-scale public deployment.

---

# Chapter 6: Conclusion and Future Scope

## 6.1 Conclusion

This project developed a network-aware credibility and propagation system for local news verification. The system combines user reliability, experience, anomaly detection, graph trust, spatial confidence, and machine learning augmentation to estimate post credibility and control information spread. A full-stack implementation was completed using FastAPI, PostgreSQL, React, Material UI, and Leaflet.

The main contribution of the project is a credibility-driven alternative to engagement-driven distribution. Instead of allowing every report to spread widely based on popularity, NCPS starts with local visibility and expands reach only when trust and evidence conditions are satisfied. Simulation results show that the full pipeline improves accuracy, reduces attack success, and improves anomaly detection compared with the base model.

The project also includes real-world engineering features such as authentication, persistent database storage, migration support, protected API routes, profile dashboards, and map-based visualization. These additions make the project suitable as a deployable final year engineering system rather than only an algorithm prototype.

## 6.2 Future Scope

Future improvements can include:

1. Integration with real local news datasets and verified incident records.
2. Administrative moderation dashboard for reviewing disputed posts.
3. Push notifications for high-credibility urgent local alerts.
4. More advanced graph neural network models for propagation analysis.
5. Privacy-preserving location verification.
6. Explainable AI views showing why a post received a credibility score.
7. Mobile application support.
8. Multi-language report processing for regional users.
9. Continuous threshold learning based on feedback.
10. Deployment with observability, audit logs, and rate limiting.

---

# References

[1] S. Vosoughi, D. Roy, and S. Aral, "The spread of true and false news online," *Science*, vol. 359, no. 6380, pp. 1146-1151, Mar. 2018, doi: 10.1126/science.aap9559.

[2] K. Shu, A. Sliva, S. Wang, J. Tang, and H. Liu, "Fake news detection on social media: A data mining perspective," *ACM SIGKDD Explorations Newsletter*, vol. 19, no. 1, pp. 22-36, 2017.

[3] N. Ruchansky, S. Seo, and Y. Liu, "CSI: A hybrid deep model for fake news detection," in *Proc. ACM Conf. Information and Knowledge Management*, 2017, pp. 797-806.

[4] T. Bian, X. Xiao, T. Xu, P. Zhao, W. Huang, Y. Rong, and J. Huang, "Rumor detection on social media with bi-directional graph convolutional networks," in *Proc. AAAI Conf. Artificial Intelligence*, vol. 34, no. 1, 2020, pp. 549-556.

[5] F. Monti, F. Frasca, D. Eynard, D. Mannion, and M. M. Bronstein, "Fake news detection on social media using geometric deep learning," arXiv:1902.06673, 2019.

[6] X. Yin, J. Han, and P. S. Yu, "Truth discovery with multiple conflicting information providers on the web," *IEEE Transactions on Knowledge and Data Engineering*, vol. 20, no. 6, pp. 796-808, 2008.

[7] J. Zhang, B. Dong, and P. S. Yu, "FAKEDETECTOR: Effective fake news detection with deep diffusive neural network," in *Proc. IEEE International Conference on Data Mining*, 2019, pp. 1826-1831.

[8] A. Gupta, H. Lamba, P. Kumaraguru, and A. Joshi, "Faking Sandy: Characterizing and identifying fake images on Twitter during Hurricane Sandy," in *Proc. International Conference on World Wide Web Companion*, 2013, pp. 729-736.

[9] P. Domingos and M. Richardson, "Mining the network value of customers," in *Proc. ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*, 2001, pp. 57-66.

[10] NCPS Project Documentation, "Network-aware Credibility and Propagation System: Architecture, Mathematical Formulae, Simulation, and Implementation Notes," Project Repository, 2026.

---

# Appendix A: API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register` | POST | Register a new user account |
| `/api/auth/login` | POST | Authenticate user and return access token |
| `/api/auth/me` | GET | Get current authenticated account |
| `/api/auth/logout` | POST | Logout acknowledgement |
| `/api/feed` | GET | Get credibility-ranked feed |
| `/api/post/create` | POST | Create a new local news report |
| `/api/post/vote` | POST | Vote credible or fake on a post |
| `/api/post/{post_id}` | GET | Get post detail |
| `/api/user/location` | POST | Update user location |
| `/api/user/me/state` | GET | Get current user trust state |
| `/api/user/me/activity` | GET | Get current user posts and votes |

---

# Appendix B: Setup and Execution

## Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## PostgreSQL Migration

```bash
export NCPS_WEBAPP_DATABASE_URL="postgresql+psycopg2://postgres:postgres@localhost:5432/ncps"
python -m alembic upgrade head
```

## Start User-Facing Webapp Backend

```bash
python -m webapp.server
```

## Start React Frontend

```bash
cd react-frontend
npm install
npm run dev
```

## Run Simulation

```bash
cd backend
source venv/bin/activate
python -m simulation.runner
```

## Run Tests

```bash
cd backend
./venv/bin/python -m pytest -q
cd ../react-frontend
npm run lint
npm run build
```

---

# Appendix C: Figure Placeholders to Replace Before Submission

1. **Fig. 1.1:** Draw a comparison between engagement-based ranking and credibility-based propagation.
2. **Fig. 1.2:** Add a local misinformation scenario diagram.
3. **Fig. 3.1:** Add complete NCPS architecture diagram.
4. **Fig. 3.2:** Add event flow from API request to state update.
5. **Fig. 3.3:** Add user weight formula pipeline.
6. **Fig. 3.4:** Add post credibility computation diagram.
7. **Fig. 3.5:** Add user graph and coordination detection illustration.
8. **Fig. 3.6:** Add spatial propagation workflow.
9. **Fig. 4.1:** Add database ER diagram.
10. **Fig. 4.2:** Add authentication and protected request flow diagram.
11. **Fig. 4.3:** Add screenshots of React pages.
12. **Fig. 5.1-Fig. 5.3:** Add charts from simulation result table.
