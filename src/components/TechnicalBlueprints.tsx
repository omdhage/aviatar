/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BookOpen, Server, Database, Shield, Zap, RefreshCw, Layers, Copy, FileText, CheckCircle } from "lucide-react";

export default function TechnicalBlueprints() {
  const [activeTab, setActiveTab] = useState<"prd" | "architecture" | "database" | "apis" | "security" | "devops">("prd");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const prismaSchemaCode = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  GUEST
  REGISTERED
  VIP
  SUPPORT
  FINANCE
  ADMIN
  SUPER_ADMIN
}

enum TransactionType {
  DEPOSIT
  WITHDRAWAL
  BET
  WIN
  BONUS
  REFERRAL
  TRANSFER
}

enum TicketStatus {
  OPEN
  PENDING
  RESOLVED
}

model User {
  id            String          @id @default(uuid())
  email         String          @unique
  username      String          @unique
  passwordHash  String
  role          Role            @default(REGISTERED)
  status        String          @default("active") // "active" | "suspended"
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  wallet        Wallet?
  referralsSent Referral[]      @relation("ReferrerRelation")
  referralsRecv Referral[]      @relation("ReferredRelation")
  bets          Bet[]
  tickets       SupportTicket[]
  auditLogs     AdminAuditLog[]
  loginHistories LoginHistory[]
  deviceTracker DeviceTracker[]
}

model Wallet {
  id              String        @id @default(uuid())
  userId          String        @unique
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  mainBalance     Decimal       @default(0.00)
  bonusBalance    Decimal       @default(0.00)
  referralBalance Decimal       @default(0.00)
  currency        String        @default("USD")
  ledgerEntries   WalletLedger[]
}

model WalletLedger {
  id            String          @id @default(uuid())
  walletId      String
  wallet        Wallet          @relation(fields: [walletId], references: [id], onDelete: Cascade)
  timestamp     DateTime        @default(now())
  type          TransactionType
  amount        Decimal
  previousBal   Decimal
  newBal        Decimal
  description   String
  referenceId   String?
}`;

  const dockerComposeCode = `version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: aviator-db
    environment:
      POSTGRES_USER: crash_admin
      POSTGRES_PASSWORD: SecretPassword123
      POSTGRES_DB: aviator_crash_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - aviator-net

  redis:
    image: redis:7-alpine
    container_name: aviator-cache
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - aviator-net

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: aviator-backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://crash_admin:SecretPassword123@postgres:5432/aviator_crash_db?schema=public
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=UltimateSuperSecureJwtSecret_2026
      - PORT=3000
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    networks:
      - aviator-net

networks:
  aviator-net:
    driver: bridge

volumes:
  postgres_data:
  redis_data:`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-900 p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-mono font-semibold tracking-wider uppercase text-red-500 bg-red-950/80 px-2 py-1 rounded border border-red-900/50">
            SYSTEM BLUEPRINT
          </span>
          <h1 className="text-2xl font-sans font-bold text-white tracking-tight mt-2">
            Architectural Certification & Planning
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            System diagrams, compliance benchmarks, state flow diagrams, Prisma schema and DevOps templates
          </p>
        </div>
        <div className="text-xs font-mono bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-slate-400 flex flex-col gap-1">
          <div><strong className="text-slate-300">Architecture:</strong> Full-Stack Event-Driven Loop</div>
          <div><strong className="text-slate-300">RNG Model:</strong> Provably Fair HMAC-SHA256</div>
          <div><strong className="text-slate-300">Protocol:</strong> Express REST + WebSockets (Socket.io)</div>
        </div>
      </div>

      {/* Navigation Rails */}
      <div className="flex flex-wrap bg-slate-950 border-b border-slate-800 p-1">
        <button
          onClick={() => setActiveTab("prd")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "prd"
              ? "text-red-500 border-b-2 border-red-500 bg-slate-900/50"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <BookOpen size={16} /> Product Requirements (PRD)
        </button>
        <button
          onClick={() => setActiveTab("architecture")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "architecture"
              ? "text-red-500 border-b-2 border-red-500 bg-slate-900/50"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Layers size={16} /> System Flows & Arch
        </button>
        <button
          onClick={() => setActiveTab("database")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "database"
              ? "text-red-500 border-b-2 border-red-500 bg-slate-900/50"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Database size={16} /> Database (Prisma)
        </button>
        <button
          onClick={() => setActiveTab("apis")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "apis"
              ? "text-red-500 border-b-2 border-red-500 bg-slate-900/50"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Server size={16} /> API & Real-time Specs
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "security"
              ? "text-red-500 border-b-2 border-red-500 bg-slate-900/50"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Shield size={16} /> Security Controls
        </button>
        <button
          onClick={() => setActiveTab("devops")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "devops"
              ? "text-red-500 border-b-2 border-red-500 bg-slate-900/50"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Zap size={16} /> Docker & DevOps
        </button>
      </div>

      {/* Content Canvas */}
      <div className="p-6 text-slate-300 max-h-[750px] overflow-y-auto font-sans leading-relaxed">
        {activeTab === "prd" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold font-sans text-white border-b border-slate-800 pb-2 mb-3">
                Product Requirement Document (PRD) — Feature Roadmap
              </h2>
              <p className="text-slate-400">
                The platform is designed to provide a high-frequency, socially interactive multiplayer crash betting experience. Real-time accuracy is critical, backed by a provably fair game loop.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-950 p-5 rounded-lg border border-slate-800">
                <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                  <BookOpen size={16} /> Standard User Featureset
                </h3>
                <ul className="space-y-2 text-sm text-slate-400 list-disc list-inside">
                  <li><strong className="text-slate-200">Dual Betting Board:</strong> Placed up to two separate concurrent bets with micro-adjustments and auto-cashout values per wager.</li>
                  <li><strong className="text-slate-200">Interactive Plane HUD:</strong> Dynamic SVG aircraft responding in pitch, trail intensity and status based on real-time multiplayer multiplier state.</li>
                  <li><strong className="text-slate-200">Double Wallet:</strong> Separate balance tracking for Real-Money/Demo balances alongside Bonus wagers.</li>
                  <li><strong className="text-slate-200">Support Chat & Tickets:</strong> Interactive complaints, attachments simulation, status updates.</li>
                  <li><strong className="text-slate-200">Leaderboard Hierarchy:</strong> Top active stakes categorized daily, weekly, and monthly with dynamic profile rankings.</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-5 rounded-lg border border-slate-800">
                <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                  <Shield size={16} /> Administrative Feature controls
                </h3>
                <ul className="space-y-2 text-sm text-slate-400 list-disc list-inside">
                  <li><strong className="text-slate-200">Real-time Game Audits:</strong> View active multiplier, count of participants inside, house exposure liabilities.</li>
                  <li><strong className="text-slate-200">RNG Mode Configuration:</strong> Dynamically change House Edge percentage values or toggle diagnostic overrides (forcing crash targets during inspection).</li>
                  <li><strong className="text-slate-200">User Suspension:</strong> Immediate lockouts for suspicious patterns with role modifications.</li>
                  <li><strong className="text-slate-200">Financial Ledger Audits:</strong> Filter transactions by ID, tracking balance movements from Main, Bonus, and Referral wallets.</li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-lg border border-slate-800">
              <h3 className="text-white font-bold mb-3">User & Staff Roles Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-400 font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-200 bg-slate-900/50">
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3">RNG Control</th>
                      <th className="py-2 px-3">User Admin</th>
                      <th className="py-2 px-3">Finance Permissions</th>
                      <th className="py-2 px-3">Support Capability</th>
                      <th className="py-2 px-3">VIP Benefits</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-900">
                      <td className="py-2 px-3 font-semibold text-white">Super Admin</td>
                      <td className="py-2 px-3 text-green-400 font-bold">Yes (All)</td>
                      <td className="py-2 px-3 text-green-400">Yes</td>
                      <td className="py-2 px-3 text-green-400">Yes</td>
                      <td className="py-2 px-3 text-green-400">Yes</td>
                      <td className="py-2 px-3">Full</td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="py-2 px-3 font-semibold text-slate-300">Admin</td>
                      <td className="py-2 px-3 text-red-500">Read-Only</td>
                      <td className="py-2 px-3 text-green-400">Yes</td>
                      <td className="py-2 px-3 text-green-400">Yes</td>
                      <td className="py-2 px-3 text-green-400">Yes</td>
                      <td className="py-2 px-3">Full</td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="py-2 px-3 font-semibold text-slate-300">Finance Manager</td>
                      <td className="py-2 px-3 text-red-500">No</td>
                      <td className="py-2 px-3 text-red-500">No</td>
                      <td className="py-2 px-3 text-green-400 bg-green-950/20">Withdraw Approve</td>
                      <td className="py-2 px-3 text-red-500">No</td>
                      <td className="py-2 px-3">N/A</td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="py-2 px-3 font-semibold text-slate-300">Support Agent</td>
                      <td className="py-2 px-3 text-red-500">No</td>
                      <td className="py-2 px-3 text-slate-400">View Logs</td>
                      <td className="py-2 px-3 text-red-500">No</td>
                      <td className="py-2 px-3 text-green-400 bg-green-950/20">Resolve Tickets</td>
                      <td className="py-2 px-3">N/A</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "architecture" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold font-sans text-white border-b border-slate-800 pb-2 mb-3">
                System Workflow Diagrams & Architecture
              </h2>
              <p className="text-slate-400 mb-4">
                The platform relies on a server-authoritative loop that communicates ticks at 100ms intervals to prevent front-end client spoofing.
              </p>
            </div>

            <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre">
              {`        [USER PANEL - RENDER ENGINE]                         [EXPRESS CONTROLLER]
         (HTML5 Canvas/Vite UI)                               (Server Authorization)
                     |                                                   |
                     |--- (1) Place Bet ($10.00 Main Account) ---------->| [Bet Validation Checked]
                     |                                                   | - Balance >= $10.00?
                     |                                                   | - Inside Countdown state?
                     |<-- (2) Acknowledge Bet Succeeded (Lock sum) ------| - Saves state in memory
                     |                                                   |
                     |                      * ROUND STARTS *             |
                     |<-- (3) TCP Frame Tick (Multiplier: 1.05x, 100ms) -| [RNG Crash Point Decided]
                     |<-- (4) TCP Frame Tick (Multiplier: 1.22x, 100ms) -|
                     |                                                   |
                     |--- (5) Click CASHOUT (Requested @ 1.25x) -------->| [Cashout Verification]
                     |                                                   | - Checks timestamp mismatch
                     |                                                   | - Multiplier matches?
                     |<-- (6) Return Succeeded Winnings ($12.50 Credit) --| [Ledger Commit Completed]
                     |                                                   |
                     |                      * AIRPLANE CRASHES *         |
                     |<-- (7) Dispatch Explosion Msg / Shockwave Info ---| [State Reset & Seed Roll]`}
            </div>

            <div className="bg-slate-950 p-5 rounded-lg border border-slate-800">
              <h3 className="text-white font-bold mb-2">Architectural Highlights Checklist</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
                <div className="flex gap-2 items-start">
                  <CheckCircle className="text-emerald-500 shrink-0 mt-1" size={16} />
                  <div>
                    <strong className="text-slate-200">Double Buffer Ledger:</strong>
                    <p className="text-xs">Prevents race conditions by using a serial database transaction pattern for wallet credits.</p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <CheckCircle className="text-emerald-500 shrink-0 mt-1" size={16} />
                  <div>
                    <strong className="text-slate-200">Anti-Spoofing Time Synchronization:</strong>
                    <p className="text-xs">Client latency offsets are checked prior to validating high-precision cashouts.</p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <CheckCircle className="text-emerald-500 shrink-0 mt-1" size={16} />
                  <div>
                    <strong className="text-slate-200">Background Bots Injection:</strong>
                    <p className="text-xs">The server handles simulating random VIP bets to sustain engaging multiplayer activity logs.</p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <CheckCircle className="text-emerald-500 shrink-0 mt-1" size={16} />
                  <div>
                    <strong className="text-slate-200">Web Audio Synth:</strong>
                    <p className="text-xs">Propellers pitch scales automatically with the frequency curves directly calculated in-browser.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "database" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
              <h2 className="text-xl font-bold font-sans text-white">Prisma Database Architecture</h2>
              <button
                onClick={() => copyToClipboard(prismaSchemaCode, "prisma")}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded text-xs font-mono transition"
              >
                {copiedId === "prisma" ? (
                  <>
                    <CheckCircle size={12} className="text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copy Schema
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-slate-400">
              Below is the Prisma schema representing Postgres indexes, relations, and ledger validation logs optimized for database transactional isolation.
            </p>
            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-96">
              {prismaSchemaCode}
            </pre>
          </div>
        )}

        {activeTab === "apis" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold font-sans text-white border-b border-slate-800 pb-2 mb-3">
                REST API & Socket.io Event Documentation
              </h2>
              <p className="text-slate-400">
                Full list of server actions, authentication scopes, and state broadcast sockets.
              </p>
            </div>

            <div className="bg-slate-950 p-5 rounded-lg border border-slate-800">
              <h3 className="text-red-400 font-bold mb-3 font-sans">1. Security & Wallet REST Gateways</h3>
              <div className="space-y-4 text-xs font-mono">
                <div className="border-b border-slate-900 pb-2">
                  <div className="flex gap-2 items-center">
                    <span className="bg-emerald-900/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">POST</span>
                    <strong className="text-slate-200">/api/v1/auth/register</strong>
                  </div>
                  <p className="text-slate-400 mt-1">Payload: <code className="text-amber-400">{"{ email, username, password }"}</code>. Registers registered or VIP user logs with Bcrypt block hashing.</p>
                </div>

                <div className="border-b border-slate-900 pb-2">
                  <div className="flex gap-2 items-center">
                    <span className="bg-emerald-900/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">POST</span>
                    <strong className="text-slate-200">/api/v1/wallet/deposit</strong>
                  </div>
                  <p className="text-slate-400 mt-1">Bearer Auth Token. Body: <code className="text-amber-400">{"{ amount, currency, walletType }"}</code>. Triggers main-wallet ledger balance accumulation.</p>
                </div>

                <div className="border-b border-slate-900 pb-2">
                  <div className="flex gap-2 items-center">
                    <span className="bg-teal-900/80 text-teal-300 border border-teal-800 px-2 py-0.5 rounded text-[10px] font-bold">GET</span>
                    <strong className="text-slate-200">/api/v1/wallet/ledger</strong>
                  </div>
                  <p className="text-slate-400 mt-1">Retreive ledger balance statement. Supports search & export callbacks.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-lg border border-slate-800">
              <h3 className="text-red-400 font-bold mb-3 font-sans">2. Sockets & Push Schedulers</h3>
              <div className="space-y-3 text-xs font-mono">
                <div>
                  <strong className="text-amber-400">CRITICAL STREAM BROADCASTS:</strong>
                  <ul className="list-disc list-inside text-slate-400 space-y-1 mt-1">
                    <li><strong className="text-slate-200">"game:countdown"</strong> — broadcast timer before plane takeoff.</li>
                    <li><strong className="text-slate-200">"game:flying_tick"</strong> — Emits float multipliers at 10hz.</li>
                    <li><strong className="text-slate-200">"game:crash"</strong> — Delivers crash points, trigger explosions, updates leaderboards.</li>
                    <li><strong className="text-slate-200">"player:bet_placed"</strong> — Updates current lobby bettors list.</li>
                    <li><strong className="text-slate-200">"player:cashout"</strong> — Broadcasts user win alerts immediately.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold font-sans text-white border-b border-slate-800 pb-2 mb-3">
                Security Architecture & Audit Protocols
              </h2>
              <p className="text-slate-400">
                Our strict protocols shield the casino engine from injection, arbitrage wagers, and token fraud.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded border border-slate-800">
                <h4 className="font-bold text-white mb-1 text-sm flex items-center gap-1">
                  <Shield size={14} className="text-red-500" /> CSRF / CORS Protections
                </h4>
                <p className="text-xs text-slate-400">
                  Strict CORS checking ensures requests come exclusively from allowed domain origins. API checks use strict request bodies parsed by Zod schemas.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded border border-slate-800">
                <h4 className="font-bold text-white mb-1 text-sm flex items-center gap-1">
                  <Shield size={14} className="text-red-500" /> Provably Fair Logs
                </h4>
                <p className="text-xs text-slate-400">
                  Crash multipliers are formulated using <code className="text-slate-300">HMAC-SHA256(ServerSeed, RoundNum)</code>, guaranteeing that game outcomes are completely auditable.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded border border-slate-800">
                <h4 className="font-bold text-white mb-1 text-sm flex items-center gap-1">
                  <Shield size={14} className="text-red-500" /> Admin 2FA Architecture
                </h4>
                <p className="text-xs text-slate-400">
                  All security controls (RNG modifiers, suspensions, manual database schema changes) require 2FA OTP codes which are recorded inside the immutable Admin Audit Log database.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "devops" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
              <h2 className="text-xl font-bold font-sans text-white">Docker Compose & DevOps Blueprints</h2>
              <button
                onClick={() => copyToClipboard(dockerComposeCode, "docker")}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded text-xs font-mono transition"
              >
                {copiedId === "docker" ? (
                  <>
                    <CheckCircle size={12} className="text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copy Docker Compose
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-slate-400">
              The platform is ready for production scaling via container orchestration. The configuration targets automatic volume persistence and fast redis cache layers.
            </p>
            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-cyan-400 overflow-x-auto max-h-96">
              {dockerComposeCode}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
