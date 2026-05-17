#Cricket: Real-Time Tournament & Live Feed Platform

Cricket is a premium, real-time cricket management ecosystem designed for organizers, athletes, and spectators. It combines professional tournament orchestration with a global live match feed, powered by an event-driven architecture for instantaneous data synchronization.

## 🚀 Key Features

### 1. Global Match Intelligence
- **Multi-Provider Sync**: Real-time integration with CricAPI and API-Sports to fetch global fixtures and live scores.
- **Deduplication Engine**: Intelligent merging of local circuit matches with global feeds to prevent data redundancy.
- **Sync Signals**: Manual refresh capabilities for organizers to force-synchronize global telemetry.

### 2. Professional Tournament Orchestration (Organizer Hub)
- **Series Wizard**: Automated fixture generation for Round Robin and Knockout formats.
- **Squad Registry**: Manage team rosters (max 15 members) and designate team authority (Captains).
- **Asset Registry**: Track venues, infrastructure, and historical series data.
- **Analytical Intelligence**: Real-time leaderboards (Points/NRR) and player performance metrics (Top Scorers, Wicket Takers).

### 3. Official Scoring Command (Umpire Hub)
- **Match Protocols**: Official management of Toss results and Playing 11 selection (11 from 15).
- **Ball-by-Ball Control**: Live scoring interface for recording runs, extras (Wides, No-Balls), and wickets.
- **Instant Broadcast**: Every delivery is instantly synchronized to the Global Live Arena via WebSockets.

### 4. System Governance (Admin Command Center)
- **User Ledger**: Comprehensive moderation of user accounts, roles, and access levels.
- **Circuit Audit**: Audit and purge entire tournaments or specific match data across the platform.
- **Global Broadcasts**: Transmit platform-wide alerts and announcements through a dedicated broadcast studio.
- **Maintenance Suite**: Tools for purging activity logs and resetting sync nodes.

### 5. Athlete & Spectator Experience
- **Recruitment System**: Join teams directly using secure invite codes provided by organizers.
- **Personal Dashboards**: Real-time tracking of personal career stats and upcoming fixtures.
- **Live Arena**: A high-fidelity spectator view featuring live scores, dynamic commentary, and ball-by-ball feeds.

## 🛠 Tech Stack

- **Frontend**: React (Vite), Framer Motion, Tailwind CSS, Socket.io-client.
- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io, JWT Auth.
- **Data Providers**: CricAPI, API-Sports (Cricket).

## 🛠 Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)

### Backend Setup
1. Navigate to the `backend` directory.
2. Install dependencies: `npm install`
3. Configure `.env` (refer to `.env.example`):
   - `MONGODB_URI`: Your MongoDB connection string.
   - `JWT_SECRET`: Secret for token signing.
   - `SPORTS_API_KEY`: Your CricAPI key.
   - `API_SPORTS_KEY`: Your API-Sports key.
4. Seed the admin account: `node src/seed.js`
5. Start development server: `npm run dev`

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Access the app at `http://localhost:5173`

## 📂 Architecture Overview

- **`backend/src/models`**: Mongoose schemas for data persistence.
- **`backend/src/controllers`**: Core business logic and API endpoints.
- **`backend/src/services`**: Integration services for live feeds and WebSockets.
- **`frontend/src/context`**: Real-time state synchronization via Sync Providers.
- **`frontend/src/pages`**: Premium glassmorphic UI components.

## 🚀 Deployment (Vercel, Render & MongoDB Atlas)

## 🚀 Deployment (Vercel, Render & MongoDB Atlas)

Deploying this real-time application is a straightforward process when using a split-stack architecture tailored to each component's strengths. To begin, the persistent data layer relies on MongoDB Atlas. You will need to create a free cluster, configure a database user with robust credentials, and securely allow-list IP addresses—typically setting it to `0.0.0.0/0` to ensure seamless communication with your cloud environments—to obtain your unique connection string. Next, the backend Node.js and Socket.io server is perfectly suited for deployment as a Web Service on Render. By creating a new service and pointing it to the `backend/` directory, you can simply set the build command to `npm install` and the start command to `node src/server.js`. It is crucial at this stage to populate Render’s environment variables with your MongoDB Atlas `MONGODB_URI`, `JWT_SECRET`, and any required external API keys to guarantee the server functions correctly. Finally, the Vite-powered React frontend can be effortlessly deployed directly to Vercel. Connect your repository, target the `frontend/` root directory, and configure the build settings to execute `npm run build` with the output directory set to `dist`. Remember to safely inject your deployed Render backend URL into Vercel’s environment settings as `VITE_API_URL` to establish full-stack connectivity.

## 🛡 Security
- **JWT Authentication**: Secure stateless authentication for all roles.
- **RBAC (Role-Based Access Control)**: Strict boundary enforcement between Admin, Organizer, Umpire, and Player actions.
- **OTP Verification**: Identity validation during signup via Email or Mobile.

---
*Built with ❤️ for the global cricket community.*
