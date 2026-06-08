# Field Ops Intelligence — Full-stack MERN Application

A full-stack, production-grade implementation of the Field Ops Intelligence system, converted from a React prototype to a modular MERN stack architecture powered by **Bun**.

---

## Technical Stack

| Layer | Technology | Description |
|---|---|---|
| **Runtime / Package Manager** | [Bun](https://bun.sh/) | Fast JavaScript runtime, package manager, and script runner. |
| **Frontend Framework** | [React 19](https://react.dev/) + [Vite 5](https://vite.dev/) | Ultrafast hot module replacement (HMR) and optimized assets building. |
| **Client-Side Routing** | [React Router v7](https://reactrouter.com/) | Handle route parameters and views navigation. |
| **HTTP Client** | [Axios](https://axios-http.com/) | Communicate with the backend REST API. |
| **Backend Framework** | [Express.js](https://expressjs.com/) | RESTful API routing, validation, and middleware. |
| **Database ODM** | [Mongoose](https://mongoosejs.com/) + [MongoDB](https://www.mongodb.com/) | Schema validation, relationship populating, and daily balance rollups. |
| **Dev Tooling** | `nodemon`, `concurrently`, `dotenv`, `morgan` | Hot reload backend server, execute parallel frontend/backend processes. |

---

## Directory Structure

```text
mining-system-prototype/
├── client/                     # React + Vite Frontend
│   ├── src/
│   │   ├── components/         # Reusable layout, UI, and table elements
│   │   ├── context/            # React Contexts (Plant selection, Toasts)
│   │   ├── hooks/              # Custom hooks fetching data from API services
│   │   ├── pages/              # Page views (InboundDelivery, DeliveryDetail, Stock)
│   │   ├── services/           # Axios instance and API abstraction layers
│   │   ├── styles/             # Global CSS & theme design tokens
│   │   └── utils/              # Client-side constants & formatters
│   ├── index.html
│   └── vite.config.js
├── server/                     # Express.js + MongoDB Backend
│   ├── config/                 # DB configuration & Env loaders
│   ├── controllers/            # Request handlers (deliveries, stock)
│   ├── middleware/             # Centralized error handlers & validation
│   ├── models/                 # Mongoose schemas (Plant, Material, Delivery, Stock, CD)
│   ├── routes/                 # Route maps pointing to controllers
│   ├── utils/                  # Stock engine and DB seeder
│   └── server.js               # Application entry point
├── .env                        # Local environment settings
└── package.json                # Concurrently runner scripts
```

---

## Prerequisites

1. **Bun** installed globally on your machine.
   * If not installed, get it from [bun.sh](https://bun.sh/).
2. **MongoDB** instance running locally on the default port: `mongodb://localhost:27017/`.

---

## Getting Started

### 1. Install Dependencies
Run the install command from the project root directory. This will automatically execute `bun install` across the root, client, and server folders:
```bash
bun run install-all
```

### 2. Configure Environment Variables
A `.env` template is provided in the project root. Create your local `.env` by copying it:
```bash
cp .env.example .env
```
Ensure `MONGO_URI` points to your local MongoDB instance.

### 3. Seed the Database
Seed the collections with the prototype's reference and transactional data:
```bash
# Clear database and seed with fresh data
bun run seed:fresh

# Incremental seed (skips existing records)
bun run seed
```

### 4. Start Development Servers
Start both the Express backend server (port 5000) and the Vite frontend dev server (port 5173) in parallel:
```bash
bun run dev
```

Open your browser and navigate to:
* **Frontend**: [http://localhost:5173](http://localhost:5173)
* **Backend Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## Key REST API Endpoints

### 1. Deliveries (IBD)
* `GET /api/deliveries` — List deliveries for a plant (query: `?plant=2025&status=All`)
* `GET /api/deliveries/:id` — Get delivery details by `ibdNumber` or `_id`
* `PATCH /api/deliveries/:id/confirm-pgr` — Confirm receipt of goods (sets state to `complete`, updates stock)
* `PATCH /api/deliveries/:id/receive-physical` — Log physical delivery with mismatch (sets state to `physical_pending`, updates stock)
* `POST /api/deliveries/sync-erp` — Synchronize with ERP (resolves variances, issues corrected deliveries)

### 2. Stock Management
* `GET /api/stock` — Get daily stock rollup balances (query: `?plant=2025&day=Today`)
* `POST /api/stock/recalculate` — Trigger database-wide stock rollup recalculation