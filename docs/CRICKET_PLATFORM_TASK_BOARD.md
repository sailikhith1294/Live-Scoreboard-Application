# Cricket Platform Task Board

This task board translates the implementation vision into a practical build checklist with file-level ownership.

## How to Use
- Mark each task as done only when API, frontend behavior, and permission checks are verified.
- Complete phases in order to preserve dependency integrity.
- Keep public feed expansion after scoring and standings are stable.

## Legend
- [x] Implemented and integrated
- [~] Partially implemented, needs hardening
- [ ] Pending

---

## Phase 1: Identity and Access Control Foundation

### Backend
- [x] JWT protect middleware for secured routes
  - File: backend/middleware/auth.js
- [x] RBAC middleware for role and permission checks
  - File: backend/middleware/rbac.js
- [x] Role and user-role persistence models
  - Files: backend/models/Role.js, backend/models/UserRole.js

### Frontend
- [x] Auth route guards
  - Files: frontend/src/components/Auth/RequireAuth.jsx, frontend/src/components/Auth/RequireRole.jsx, frontend/src/components/Auth/RequirePermission.jsx
- [x] Role-based route protection in app router
  - File: frontend/src/App.jsx

Acceptance checks:
- Authenticated users cannot access unauthorized pages.
- Permission-gated routes block and show feedback correctly.

---

## Phase 2: Admin Governance and Role Approval

### Backend APIs
- [x] Get users and role details
  - Routes: GET /api/admin/users, GET /api/admin/users/:userId
- [x] Assign role by email (with pending-request dependency)
  - Route: POST /api/admin/users/assign-role-by-email
- [x] Role request queue management
  - Routes: GET /api/admin/pending-requests, POST /api/admin/approve-request/:userRoleId, POST /api/admin/reject-request/:userRoleId
- [x] Manager revoke and user moderation endpoints
  - Routes in backend/routes/admin.js

### Frontend
- [x] Admin Dashboard list + pending queue + approve/reject actions
  - File: frontend/src/components/Dashboard/AdminDashboard.jsx
- [x] Auth API role request methods
  - File: frontend/src/services/api.js (authAPI.requestRole, authAPI.getMyRoleRequest)

### Hardening tasks
- [ ] Add audit log table for approvals/rejections with actor, timestamp, and reason
- [ ] Add bulk approval/rejection actions with confirmation and rollback safety
- [ ] Add pagination and filters to large user lists

Acceptance checks:
- Role transitions update primary role and active role set consistently.
- Non-admin users cannot perform admin actions.

---

## Phase 3: User and Public Consumption Layer

### Current
- [x] User-facing dashboards and read-only access routes exist
  - Files: frontend/src/components/Dashboard/UserDashboard.jsx, frontend/src/App.jsx
- [x] Role request panel present for upgrade flow
  - File: frontend/src/components/Dashboard/RoleRequestPanel.jsx

### Pending
- [ ] Add dedicated Contact Admin workflow screen with request history timeline
- [ ] Add richer public tournament list and points-table index page with filters

Acceptance checks:
- Standard user can browse read-only content and submit role request from UI.

---

## Phase 4: Tournament and Resource Operations (Manager Core)

### Backend APIs (implemented)
- [x] League create/list/get/update/delete
  - Routes: /api/tournament/leagues*, /api/tournament/my-leagues
  - Controller: backend/controllers/leagueController.js
- [x] League manager assignment and status transitions
  - Routes: /api/tournament/leagues/:leagueId/add-manager, /status
- [x] Fixture retrieval + round-robin generation
  - Routes: /api/tournament/leagues/:leagueId/fixtures, /generate-fixtures
- [x] Team create/update/get/list + player add/remove
  - Routes: /api/tournament/teams*, /api/tournament/leagues/:leagueId/teams
  - Controller: backend/controllers/tournamentTeamController.js

### Frontend Manager Operations (implemented)
- [x] End-to-end handlers in Manager dashboard
  - File: frontend/src/components/Dashboard/TournamentManagerDashboard.jsx
  - Includes:
    - refreshAll
    - refreshLeagueData
    - handleCreateLeague
    - handleUpdateLeague
    - handleDeleteLeague
    - handleStatusChange
    - handleGenerateFixtures
    - handleCreateTeam
    - handleUpdateTeam
    - handleAddPlayer
    - handleRemovePlayer

### Hardening tasks
- [ ] Enforce league date windows against scheduled fixtures on update/delete
- [ ] Add strict server-side validation for team/player fields and duplicate checks by normalized keys
- [ ] Add optimistic UI rollback handling for all manager mutations
- [ ] Add integration tests for manager lifecycle flows

Acceptance checks:
- Manager can run full league-team-player-fixture flow without manual DB intervention.

---

## Phase 5: Live Scoring and Match Lifecycle Engine

### Existing base
- [~] Match APIs and live endpoints exist
  - File: backend/routes/matches.js
  - File: backend/controllers/matchController.js
- [~] Frontend live surfaces exist
  - Files: frontend/src/components/LiveTicker/EnhancedLiveTicker.jsx, frontend/src/components/Match/EnhancedMatchCenter.jsx

### Pending core engine work
- [x] Define explicit match state machine:
  - pre_match -> toss -> innings_1 -> innings_break -> innings_2 -> completed/cancelled
- [x] Persist atomic ball events with idempotency key and monotonic sequence
- [x] Implement innings transition guardrails and chase-target recalculation rules
- [x] Add correction workflow (undo/void ball) with audit trail
- [ ] Add concurrency controls for simultaneous scorer updates

Recently shipped (April 2026):
- Added lifecycle transition API: `PUT /api/matches/:id/lifecycle`
- Added scorer event API: `POST /api/matches/:id/events/ball`
- Added guarded status transition validation in `PUT /api/matches/:id/status`
- Added permission gates (`tournament.manage_scores`) on scoring/lifecycle routes
- Added ball undo endpoint with audit trail: `POST /api/matches/:id/events/ball/undo`

Acceptance checks:
- No invalid state jumps allowed.
- Ball stream remains consistent under retries and reconnects.

---

## Phase 6: Player Dashboard and Participation

### Current
- [~] Player dashboard shell and navigation cards exist
  - File: frontend/src/components/Dashboard/PlayerDashboard.jsx

### Pending
- [x] Career stats panel (strike rate, economy, batting/bowling splits)
- [x] Upcoming matches for player's own team(s)
- [ ] Team invitations and accept/reject flow
- [ ] Personal form trend charts from scoring data

Acceptance checks:
- Player dashboard reflects real user-specific data instead of static links only.

---

## Phase 7: Statistics and Standings Pipeline

### Current
- [~] Fixture and team data foundation exists for standings computation

### Pending
- [~] Auto-update points and NRR on match completion
- [ ] Leaderboard generation (batting, bowling, MVP)
- [ ] Materialized standings endpoint for public and manager dashboards
- [ ] Recompute/backfill script for historical correction scenarios

Recently shipped (April 2026):
- Added standings update hook on match completion (`standingsApplied` guard + service apply)
- Added player summary API: `GET /api/matches/player/my-performance`

Acceptance checks:
- Standings and leaderboards update deterministically from scoring events.

---

## Cross-Cutting Quality Tasks
- [ ] Add API-level request validation middleware schema coverage
- [ ] Add centralized error codes for frontend-friendly handling
- [ ] Add end-to-end tests for admin -> manager -> scoring -> standings flow
- [ ] Add observability counters for scoring throughput and state transition failures

---

## Suggested Build Order (Execution Queue)
1. Phase 4 hardening tasks (manager core stability)
2. Phase 5 state-machine and atomic scoring engine
3. Phase 7 standings pipeline automation
4. Phase 6 player personalization and invitations
5. Phase 2/3 UX enhancements (admin/public polish)

---

## Ready-to-Start Next Sprint Checklist
- [x] Create match lifecycle state enum and transition validator in backend
- [x] Add ball-event persistence model with sequence + idempotency
- [ ] Build standings update service triggered on match completion
- [ ] Expose player-centric stats endpoint and wire PlayerDashboard widgets
- [ ] Add integration tests for league -> fixture -> score -> standings pipeline
