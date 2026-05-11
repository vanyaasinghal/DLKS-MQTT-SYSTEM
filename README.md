# DLKS-MQTT — A Lightweight Key Sharing Protocol for Secure IoT Communications

**Group 72 · Project Exhibition 2**

## Overview

DLKS-MQTT (Dynamic Lightweight Key Sharing for MQTT) is a security mechanism designed for resource-constrained IoT devices. It provides integrity, confidentiality, and authenticity without the heavy computational cost of traditional cryptographic methods.

## Project Structure

```
dlks-mqtt/
├── server.js              # Express server + DLKS-MQTT protocol logic
├── package.json
└── public/
    ├── index.html         # Glassmorphism UI
    ├── css/
    │   └── style.css      # Minimal glass UI styles
    └── js/
        └── main.js        # Interactive handshake demo
```

## Getting Started

### Install dependencies
```bash
npm install
```

### Run the server
```bash
node server.js
```

Open **http://localhost:3000** in your browser.

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/handshake/initiate` | Device sends CONNECT with K_sess + nonce |
| POST | `/api/handshake/verify` | Broker verifies nonce and authenticates |
| POST | `/api/handshake/establish` | Broker sends CONNACK, session goes live |
| GET | `/api/sessions` | List all active sessions |
| DELETE | `/api/sessions/:deviceId` | Clear a session |
| GET | `/api/performance` | Benchmark metrics |

## Performance

| Metric | DLKS-MQTT | SMQTT |
|--------|-----------|-------|
| Energy | 0.0014 mJ | 0.00177 mJ |
| Execution Time | 0.40 s | 2.80 s |
| Overhead | 60 bytes/msg | Higher |

## Group Members

- Vanya Singhal (24BCY10046)
- Anant Verma (24BCY10402)
- Meet Vichare (24BCY10406)
- Laksh Mahajan (24BCY10255)
- Jishnu Sanjeev (24BCY10094)
