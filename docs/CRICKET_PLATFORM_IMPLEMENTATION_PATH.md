# Cricket Platform Implementation Path

## Vision Summary
This platform follows a modular, hierarchical implementation path starting from secure Identity and Access Control using JWT authentication and RBAC. It is governed by an Admin layer that controls role approvals, enables Manager operations for tournament execution, supports Player development workflows, and continuously publishes statistics and standings back to the public experience.

## Architecture Layers
1. Identity and Access Control Foundation
2. Admin Governance and Role Approval
3. User and Public Consumption Layer
4. Tournament and Resource Operations Layer
5. Live Scoring and Match Lifecycle Engine
6. Player Growth and Participation Layer
7. Statistics and Standings Pipeline

## Module Contracts

### 1) Identity and Access Control Foundation
Goal: Authenticate users securely and enforce permission-scoped access.

Core capabilities:
- JWT token issue and verification.
- Role and permission checks on protected APIs.
- Route-level guards in frontend for role and permission gates.

Current status:
- Implemented in backend auth middleware, RBAC middleware, and guarded frontend routes.

### 2) Admin Governance and Role Approval
Goal: Central gatekeeper for promotions and demotions.

Core capabilities:
- Admin dashboard for user oversight.
- Role-request queue for user-to-player and user-to-manager upgrades.
- Approval and rejection workflow with audit-friendly role records.

Current status:
- Implemented with request/approval endpoints and admin role management flows.

### 3) User and Public Consumption Layer
Goal: Read-only experience for regular users and public visitors.

Core capabilities:
- Live/scheduled/completed match visibility.
- Tournament and points-table discovery.
- Contact-admin path for onboarding and role request initiation.

Current status:
- Dashboards and role request APIs exist; public feed integration exists.

### 4) Tournament and Resource Operations Layer
Goal: Give managers control of tournament operations.

Core capabilities:
- League create, edit, delete, and status transitions.
- Team create and update.
- Player add/remove manually or via existing user ID.
- Fixture generation and league-level fixture retrieval.

Current status:
- Implemented across tournament APIs, controllers, and manager dashboard handlers.

### 5) Live Scoring and Match Lifecycle Engine
Goal: State-driven, high-integrity match progression.

Core capabilities:
- Pre-match setup and toss context.
- Ball-by-ball event recording.
- Inning transitions and target recalculation.
- Match state transitions with integrity checks.

Current status:
- Partially implemented. Live surfaces exist, but strict tournament state-machine hardening remains a targeted completion area.

### 6) Player Growth and Participation Layer
Goal: Personal dashboard for performance and team participation.

Core capabilities:
- Career metrics like strike rate and economy.
- Upcoming schedule and participation context.
- Team invitation or roster visibility flows.

Current status:
- Dashboard shell exists. Deep invitation workflow and advanced personalized analytics can be expanded.

### 7) Statistics and Standings Pipeline
Goal: Convert raw scoring events into standings and public insights.

Core capabilities:
- Team standings and points updates.
- Leaderboards.
- Public-facing summaries and trend outputs.

Current status:
- Partially implemented. Pipeline hardening and full automatic propagation are planned completion items.

## Hierarchical Implementation Plan
1. Lock identity and permission matrix as baseline.
2. Finalize admin approval queue and role lifecycle correctness.
3. Complete manager operations with strict validation and error handling.
4. Complete match lifecycle state machine and scorer integrity constraints.
5. Finalize player-centric dashboards and invitations.
6. Complete automated stats and standings propagation.
7. Re-enable full public feed publishing after operations and scoring are stable.

## Definition of Done for Tournament Organizer Completion
- Manager can fully operate leagues, teams, players, and fixtures end-to-end.
- Live scorer transitions are deterministic with clear validation errors.
- Standings update automatically from scoring events.
- Role-based access is enforced on all tournament APIs and frontend pages.
- Admin can approve and revoke roles safely with traceable role state.
- Player dashboard shows meaningful personal metrics and participation data.

## Execution Notes
- Keep APIs modular by domain: auth, admin, tournament, scoring, stats.
- Keep state transitions explicit and auditable.
- Keep public feed publishing downstream from validated scoring events.
