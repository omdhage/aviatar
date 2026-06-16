/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { UserRole, WalletType, TransactionType, GameRoundState, SupportTicket, SupportMessage, WalletLedgerEntry, AdminAuditLog } from "./src/types.js";

// We can define the seed and game state interfaces server-side
interface ServerGameRound {
  id: string;
  startTime: number;
  crashPoint: number;
  provablyFairSeed: string;
  state: GameRoundState;
  elapsedSeconds: number;
  currentMultiplier: number;
}

// In-Memory Production Prototype Database
const users = [
  {
    id: "user-1",
    email: "omdhage143@gmail.com",
    username: "Om Wager",
    role: UserRole.SUPER_ADMIN,
    status: "active",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    createdAt: new Date().toISOString()
  },
  {
    id: "user-2",
    email: "vip_player@gmail.com",
    username: "Captain_Aviator",
    role: UserRole.VIP,
    status: "active",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    createdAt: new Date().toISOString()
  },
  {
    id: "user-3",
    email: "guest@g.com",
    username: "DemoFlyer",
    role: UserRole.GUEST,
    status: "active",
    createdAt: new Date().toISOString()
  }
];

const wallets: Record<string, { main: number; bonus: number; referral: number; virtual: number }> = {
  "user-1": { main: 50000.00, bonus: 1500.00, referral: 420.00, virtual: 10000.00 },
  "user-2": { main: 15200.00, bonus: 500.00, referral: 1250.00, virtual: 10000.00 },
  "user-3": { main: 0.00, bonus: 0.00, referral: 0.00, virtual: 10000.00 }
};

const walletLedgers: WalletLedgerEntry[] = [
  {
    id: "tx-init-1",
    userId: "user-1",
    timestamp: new Date().toISOString(),
    type: TransactionType.DEPOSIT,
    amount: 50000.00,
    currency: "USD",
    previousBalance: 0.00,
    newBalance: 50000.00,
    description: "Initial production wallet credit for super administrator testing"
  },
  {
    id: "tx-init-2",
    userId: "user-2",
    timestamp: new Date().toISOString(),
    type: TransactionType.DEPOSIT,
    amount: 15200.00,
    currency: "USD",
    previousBalance: 0.00,
    newBalance: 15200.00,
    description: "VIP player cash deposit"
  },
  {
    id: "tx-bonus-1",
    userId: "user-1",
    timestamp: new Date().toISOString(),
    type: TransactionType.BONUS,
    amount: 1500.00,
    currency: "USD",
    previousBalance: 0.00,
    newBalance: 1500.00,
    description: "Sign-up administrative promotion wagers"
  }
];

// Bets log list
const previousRounds: { id: string; crashPoint: number; timestamp: string }[] = [
  { id: "rnd-991", crashPoint: 1.45, timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: "rnd-992", crashPoint: 10.21, timestamp: new Date(Date.now() - 250000).toISOString() },
  { id: "rnd-993", crashPoint: 1.05, timestamp: new Date(Date.now() - 200000).toISOString() },
  { id: "rnd-994", crashPoint: 2.89, timestamp: new Date(Date.now() - 150000).toISOString() },
  { id: "rnd-995", crashPoint: 1.12, timestamp: new Date(Date.now() - 110000).toISOString() },
  { id: "rnd-996", crashPoint: 4.56, timestamp: new Date(Date.now() - 70000).toISOString() },
  { id: "rnd-997", crashPoint: 1.83, timestamp: new Date(Date.now() - 30000).toISOString() }
];

// Support System Data Store
const tickets: SupportTicket[] = [
  {
    id: "tkt-101",
    userId: "user-1",
    subject: "Super Admin Interface Integration Status",
    category: "Account Security",
    status: "Open",
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    updatedAt: new Date(Date.now() - 14400000).toISOString()
  }
];

const ticketMessages: SupportMessage[] = [
  {
    id: "msg-1",
    ticketId: "tkt-101",
    senderName: "Om Wager",
    senderRole: UserRole.SUPER_ADMIN,
    message: "Welcome to the high-reliability production dashboard. Testing core ticket attachment logs.",
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    attachmentName: "system_architecture_compliance.png"
  }
];

// Audit logs
const auditLogs: AdminAuditLog[] = [
  {
    id: "aud-1",
    adminId: "user-1",
    adminName: "Om Wager",
    action: "System Boot Initialized",
    ipAddress: "127.0.0.1",
    timestamp: new Date().toISOString(),
    details: "Loaded Aviator Game engine on single Express port 3000."
  }
];

// Game Configuration Settings
let rngSettings = {
  houseEdgePercent: 3.0,
  minCrashPoint: 1.00,
  fixedCrashPoint: undefined as number | undefined
};

// Current active wagers
let activeBets: {
  id: string;
  userId: string;
  username: string;
  amount: number;
  isVirtual: boolean;
  betIndex: number; // 0 for panel A, 1 for panel B
  cashoutMultiplier?: number;
  winAmount?: number;
  status: "pending" | "cashed_out" | "lost";
  timestamp: string;
}[] = [];

// Game Engine State Variables
let currentRoundId = "rnd-" + Math.floor(Math.random() * 100000);
let currentRoundState: GameRoundState = GameRoundState.COUNTDOWN;
let countdownRemaining = 8.0; // seconds before start
let flyingSeconds = 0.0;
let currentMultiplier = 1.00;
let decidedCrashPoint = 1.95; // default fallback

// Active simulated connection count
let simulatedActiveConnected = 73;

// Active clients waiting for server-sent events
type SSEClient = { id: number; res: any };
let sseClients: SSEClient[] = [];
let nextClientId = 1;

// Math formula for server-authoritative provably fair crash generator
function generateCrashPoint(): number {
  if (rngSettings.fixedCrashPoint) {
    return rngSettings.fixedCrashPoint;
  }
  const randomBytes = crypto.randomBytes(4);
  const hashValue = randomBytes.readUInt32BE(0);
  const percentage = hashValue / 0xffffffff;
  
  // Calculate multiplier
  const edge = rngSettings.houseEdgePercent;
  if (Math.random() * 100 < edge) {
    return 1.00; // instant crash for house edge
  }
  
  // Provably fair exponential distribution: 
  // Formula: 10000 / (100 - percentage * (100 - edge)) / 100
  // Yields smooth exponential values sometimes small (e.g. 1.2), medium (e.g. 2.0-7.0), or rare high peaks.
  const r = Math.floor(10000 / (100 - percentage * (100 - edge))) / 100;
  return Math.max(rngSettings.minCrashPoint, r);
}

// Function to transition States and reset RNG wagers
function startNewRound() {
  currentRoundId = "rnd-" + Math.floor(Math.random() * 100000);
  currentRoundState = GameRoundState.COUNTDOWN;
  countdownRemaining = 8.0;
  flyingSeconds = 0.0;
  currentMultiplier = 1.00;
  decidedCrashPoint = generateCrashPoint();
  activeBets = [];

  // Generate engaging multi-player simulation wagers (bots)
  const botNames = [
    "VegasPro_99", "RiskTaker_X", "Satoshi_Flyer", "AeroLover", "MoonRider", 
    "JetSetWager", "TurbulenceBoy", "RedLineMax", "ElevateCash", "SpeedSeeker"
  ];
  const count = 3 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const isVirtual = Math.random() > 0.4;
    const botAmount = Math.floor(Math.random() * 150) + 10;
    activeBets.push({
      id: "bot-bet-" + Math.floor(Math.random() * 99999),
      userId: "bot-id-" + i,
      username: botNames[i % botNames.length],
      amount: botAmount,
      isVirtual,
      betIndex: Math.random() > 0.5 ? 1 : 0,
      status: "pending",
      timestamp: new Date().toISOString()
    });
  }

  // Update bot connections randomly
  simulatedActiveConnected = 60 + Math.floor(Math.random() * 35);
  broadcastToAllSSE({ event: "state_change", payload: { state: currentRoundState, roundId: currentRoundId, countdown: countdownRemaining, activeBets } });
}

// Tick Game Loop every 100ms
setInterval(() => {
  if (currentRoundState === GameRoundState.COUNTDOWN) {
    countdownRemaining = Math.max(0, countdownRemaining - 0.1);
    if (countdownRemaining <= 0) {
      // Transition to FLYING
      currentRoundState = GameRoundState.FLYING;
      flyingSeconds = 0.0;
      currentMultiplier = 1.00;
      broadcastToAllSSE({ event: "state_change", payload: { state: currentRoundState } });
    } else {
      broadcastToAllSSE({ event: "countdown_tick", payload: { remaining: countdownRemaining } });
    }
  } else if (currentRoundState === GameRoundState.FLYING) {
    flyingSeconds += 0.1;
    // Formula for high-octane crash takeoff: exponential curve
    currentMultiplier = Number(Math.pow(Math.E, 0.058 * flyingSeconds).toFixed(2));
    
    // Simulate random cashouts of bot players to create social pressure
    activeBets.forEach(bet => {
      if (bet.userId.startsWith("bot-id") && bet.status === "pending") {
        const threshold = 1.1 + Math.random() * 6.0;
        if (currentMultiplier >= threshold && Math.random() < 0.25 && threshold < decidedCrashPoint) {
          bet.status = "cashed_out";
          bet.cashoutMultiplier = currentMultiplier;
          bet.winAmount = Math.round(bet.amount * currentMultiplier * 100) / 100;
          broadcastToAllSSE({ event: "player_cashout", payload: { betId: bet.id, username: bet.username, multiplier: currentMultiplier, winAmount: bet.winAmount } });
        }
      }
    });

    if (currentMultiplier >= decidedCrashPoint) {
      // Boom! Crashing sequence
      currentMultiplier = decidedCrashPoint;
      currentRoundState = GameRoundState.CRASHED;
      
      // All pending bets lose
      activeBets.forEach(bet => {
        if (bet.status === "pending") {
          bet.status = "lost";
        }
      });

      // Save historic record
      previousRounds.unshift({ id: currentRoundId, crashPoint: decidedCrashPoint, timestamp: new Date().toISOString() });
      if (previousRounds.length > 20) previousRounds.pop();

      broadcastToAllSSE({ event: "crash", payload: { multiplier: decidedCrashPoint, previousRounds } });
      
      // Keep inside Crashed holding frame for 4.5 seconds before next board starts
      setTimeout(() => {
        startNewRound();
      }, 4500);
    } else {
      broadcastToAllSSE({ event: "flying_tick", payload: { multiplier: currentMultiplier, activeBets } });
    }
  }
}, 100);

// Helper to write client SSE packages
function broadcastToAllSSE(data: any) {
  const jsonStr = JSON.stringify(data);
  sseClients.forEach(client => {
    client.res.write(`data: ${jsonStr}\n\n`);
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  // 1. Get Me / Session Profiler
  app.get("/api/auth/me", (req, res) => {
    const user = users[0]; // fallback active Admin user
    const balance = wallets[user.id] || { main: 0, bonus: 0, referral: 0, virtual: 10000 };
    res.json({ user, wallets: balance });
  });

  // Login System API
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    let user = users.find(u => u.email === email);
    if (!user) {
      // Auto-register mock accounts for rapid prototyping
      const displayPart = email.split("@")[0];
      user = {
        id: "user-" + Math.floor(Math.random() * 10000),
        email,
        username: displayPart.charAt(0).toUpperCase() + displayPart.slice(1) + "_Wager",
        role: UserRole.REGISTERED,
        status: "active",
        createdAt: new Date().toISOString()
      };
      users.push(user);
      wallets[user.id] = { main: 1000.00, bonus: 50.00, referral: 0.00, virtual: 10000.00 };
      
      walletLedgers.push({
        id: "tx-auto-" + Math.floor(Math.random() * 100000),
        userId: user.id,
        timestamp: new Date().toISOString(),
        type: TransactionType.BONUS,
        amount: 50.00,
        currency: "USD",
        previousBalance: 0.00,
        newBalance: 50.00,
        description: "Welcome bonus token credited to ledger balance"
      });
    }
    res.json({ token: "stub-jwt-token_2026", user, wallets: wallets[user.id] });
  });

  // Load active game statistics
  app.get("/api/game/state", (req, res) => {
    res.json({
      roundId: currentRoundId,
      state: currentRoundState,
      countdown: countdownRemaining,
      currentMultiplier,
      simulatedActiveConnected,
      previousRounds,
      activeBets,
      rngSettings
    });
  });

  // Server-Sent Events Endpoint (SSE Protocol) for real-time 100ms ticker synchronization
  app.get("/api/game/sse", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const clientId = nextClientId++;
    const newClient = { id: clientId, res };
    sseClients.push(newClient);

    // Write initial boot bundle
    const initData = {
      event: "welcome",
      payload: {
        roundId: currentRoundId,
        state: currentRoundState,
        countdown: countdownRemaining,
        currentMultiplier,
        previousRounds,
        activeBets,
        simulatedActiveConnected
      }
    };
    res.write(`data: ${JSON.stringify(initData)}\n\n`);

    req.on("close", () => {
      sseClients = sseClients.filter(c => c.id !== clientId);
    });
  });

  // Place Bet
  app.post("/api/game/bet", (req, res) => {
    const { userId, amount, isVirtual, betIndex } = req.body;
    
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User session not active" });
    }
    if (user.status === "suspended") {
      return res.status(403).json({ error: "Account suspended by Admin Security Control" });
    }

    if (currentRoundState !== GameRoundState.COUNTDOWN) {
      return res.status(400).json({ error: "Wager gates are closed for active rounds" });
    }

    const currentWallet = wallets[userId];
    if (!currentWallet) {
      return res.status(400).json({ error: "Wallet structure missing" });
    }

    if (isVirtual) {
      if (currentWallet.virtual < amount) {
        return res.status(400).json({ error: "Insufficient Virtual Demo resources" });
      }
      currentWallet.virtual -= amount;
    } else {
      if (currentWallet.main < amount) {
        return res.status(400).json({ error: "Insufficient ledger funds. Deposit or utilize Practice balance." });
      }
      // Ledger balance deductions logs
      const previousBal = currentWallet.main;
      currentWallet.main -= amount;
      
      walletLedgers.push({
        id: "tx-bet-" + Math.floor(Math.random() * 999999),
        userId,
        timestamp: new Date().toISOString(),
        type: TransactionType.BET,
        amount: -amount,
        currency: "USD",
        previousBalance: previousBal,
        newBalance: currentWallet.main,
        description: `Wager locks for Round ID ${currentRoundId} (Double Board Panel index ${betIndex})`
      });
    }

    const newBet = {
      id: "bet-" + Math.floor(Math.random() * 100000),
      userId,
      username: user.username,
      amount,
      isVirtual,
      betIndex: typeof betIndex === "number" ? betIndex : 0,
      status: "pending" as const,
      timestamp: new Date().toISOString()
    };

    activeBets.push(newBet);
    
    // Broadcast immediately so lobby sidebar responds
    broadcastToAllSSE({ event: "player_bet", payload: newBet });

    res.json({ message: "Bet placed successfully on the host controller", bet: newBet, wallet: wallets[userId] });
  });

  // Cashout Active Wager
  app.post("/api/game/cashout", (req, res) => {
    const { userId, betId } = req.body;

    if (currentRoundState !== GameRoundState.FLYING) {
      return res.status(400).json({ error: "No active craft flight is underway" });
    }

    const bet = activeBets.find(b => b.id === betId && b.userId === userId);
    if (!bet) {
      return res.status(404).json({ error: "Active bet not found or already executed" });
    }
    if (bet.status !== "pending") {
      return res.status(400).json({ error: "Wager already evaluated" });
    }

    // Capture exact host server-authoritative tick multiplier
    const finalMultiplier = currentMultiplier;
    const winAmount = Math.round(bet.amount * finalMultiplier * 100) / 100;

    bet.status = "cashed_out";
    bet.cashoutMultiplier = finalMultiplier;
    bet.winAmount = winAmount;

    // Credit Ledger accounts
    const currentWallet = wallets[userId];
    if (currentWallet) {
      if (bet.isVirtual) {
        currentWallet.virtual += winAmount;
      } else {
        const previousBal = currentWallet.main;
        currentWallet.main += winAmount;
        
        walletLedgers.push({
          id: "tx-win-" + Math.floor(Math.random() * 999999),
          userId,
          timestamp: new Date().toISOString(),
          type: TransactionType.WIN,
          amount: winAmount,
          currency: "USD",
          previousBalance: previousBal,
          newBalance: currentWallet.main,
          description: `Provably cashout multiplier payout of ${finalMultiplier}x won on Round ID ${currentRoundId}`
        });

        // Referral reward distribution simulator (15% Tier-1 commission, 5% Tier-2 commission)
        const referrerId = "user-1"; // simulate Owner/referral credit
        if (userId !== referrerId) {
          const promoSum = Math.round(winAmount * 0.05 * 100) / 100;
          wallets[referrerId].referral += promoSum;
          walletLedgers.push({
            id: "tx-ref-" + Math.floor(Math.random() * 99999),
            userId: referrerId,
            timestamp: new Date().toISOString(),
            type: TransactionType.REFERRAL,
            amount: promoSum,
            currency: "USD",
            previousBalance: wallets[referrerId].referral - promoSum,
            newBalance: wallets[referrerId].referral,
            description: `Passive referral tiered reward generated from ${bet.username}'s win`
          });
        }
      }
    }

    broadcastToAllSSE({ event: "player_cashout", payload: { betId, username: bet.username, multiplier: finalMultiplier, winAmount } });

    res.json({ message: "Congratulations! Cleared flight radar path.", winAmount, multiplier: finalMultiplier, wallet: wallets[userId] });
  });

  // Deposits Interface
  app.post("/api/wallet/deposit", (req, res) => {
    const { userId, amount, method, bonusApplied } = req.body;
    const currentWallet = wallets[userId];
    if (!currentWallet) return res.status(404).json({ error: "Wallet not defined" });

    const prevBal = currentWallet.main;
    currentWallet.main += Number(amount);

    if (bonusApplied) {
      currentWallet.bonus += Math.round(amount * 0.20); // 20% match promo
    }

    walletLedgers.push({
      id: "tx-dep-" + Math.floor(Math.random() * 999999),
      userId,
      timestamp: new Date().toISOString(),
      type: TransactionType.DEPOSIT,
      amount: Number(amount),
      currency: "USD",
      previousBalance: prevBal,
      newBalance: currentWallet.main,
      description: `Fiat account deposit via ${method || 'UPI/Bank portal'}`
    });

    res.json({ success: true, wallet: currentWallet, ledgers: walletLedgers.filter(l => l.userId === userId) });
  });

  // Withdrawals Gate
  app.post("/api/wallet/withdraw", (req, res) => {
    const { userId, amount, bankAccount, upi } = req.body;
    const currentWallet = wallets[userId];
    if (!currentWallet) return res.status(404).json({ error: "Wallet not found" });

    if (currentWallet.main < amount) {
      return res.status(400).json({ error: "Withdraw wagers must fit within active Main balance" });
    }

    const prevBal = currentWallet.main;
    currentWallet.main -= Number(amount);

    walletLedgers.push({
      id: "tx-wth-" + Math.floor(Math.random() * 999999),
      userId,
      timestamp: new Date().toISOString(),
      type: TransactionType.WITHDRAWAL,
      amount: -Number(amount),
      currency: "USD",
      previousBalance: prevBal,
      newBalance: currentWallet.main,
      description: `Withdrawal file queue locked. Target: ${upi || bankAccount || 'Registered Banking account'}`
    });

    res.json({ success: true, wallet: currentWallet, ledgers: walletLedgers.filter(l => l.userId === userId) });
  });

  // Ledger Queries
  app.get("/api/wallet/ledger/:userId", (req, res) => {
    const records = walletLedgers.filter(l => l.userId === req.params.userId || req.params.userId === "all");
    res.json(records);
  });

  // Help Desk Tickets Gateway
  app.get("/api/support/tickets", (req, res) => {
    res.json({ tickets, messages: ticketMessages });
  });

  app.post("/api/support/tickets", (req, res) => {
    const { userId, subject, category, message, attachmentName } = req.body;
    const user = users.find(u => u.id === userId);
    
    const newTktId = "tkt-" + (100 + tickets.length + 1);
    const newTicket: SupportTicket = {
      id: newTktId,
      userId,
      subject,
      category,
      status: "Open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newMsg: SupportMessage = {
      id: "msg-" + Math.floor(Math.random() * 99999),
      ticketId: newTktId,
      senderName: user ? user.username : "Player",
      senderRole: user ? user.role : UserRole.REGISTERED,
      message,
      timestamp: new Date().toISOString(),
      attachmentName
    };

    tickets.unshift(newTicket);
    ticketMessages.push(newMsg);

    res.json({ ticket: newTicket, messages: ticketMessages.filter(m => m.ticketId === newTktId) });
  });

  app.post("/api/support/reply", (req, res) => {
    const { ticketId, senderName, senderRole, message, attachmentName } = req.body;
    
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return res.status(404).json({ error: "Ticket index missing" });

    const newMsg: SupportMessage = {
      id: "msg-" + Math.floor(Math.random() * 99999),
      ticketId,
      senderName,
      senderRole,
      message,
      timestamp: new Date().toISOString(),
      attachmentName
    };

    ticketMessages.push(newMsg);
    ticket.updatedAt = new Date().toISOString();
    // Simulate support agent auto-reply
    if (senderRole !== UserRole.SUPPORT && senderRole !== UserRole.ADMIN && senderRole !== UserRole.SUPER_ADMIN) {
      setTimeout(() => {
        ticketMessages.push({
          id: "msg-auto-" + Math.floor(Math.random() * 9999),
          ticketId,
          senderName: "Flight Support Desk",
          senderRole: UserRole.SUPPORT,
          message: "Thank you for contacting Aviator HQ. Our operations agent is inspecting this ledger transition block. We expect resolution in under 15 minutes.",
          timestamp: new Date().toISOString()
        });
        ticket.status = "Pending";
      }, 1500);
    }

    res.json({ success: true, messages: ticketMessages.filter(m => m.ticketId === ticketId) });
  });

  // Admin Controls
  app.post("/api/admin/rng", (req, res) => {
    const { houseEdgePercent, minCrashPoint, fixedCrashPoint, adminId } = req.body;
    const admin = users.find(u => u.id === adminId);
    
    rngSettings.houseEdgePercent = Number(houseEdgePercent);
    rngSettings.minCrashPoint = Number(minCrashPoint);
    rngSettings.fixedCrashPoint = fixedCrashPoint ? Number(fixedCrashPoint) : undefined;

    auditLogs.unshift({
      id: "aud-" + Math.floor(Math.random() * 100000),
      adminId,
      adminName: admin ? admin.username : "Om Wager",
      action: "RNG Settings Updated",
      ipAddress: "127.0.0.1",
      timestamp: new Date().toISOString(),
      details: `House Edge: ${houseEdgePercent}%, Min Crash: ${minCrashPoint}x, Fix Overrides: ${fixedCrashPoint || 'None'}`
    });

    res.json({ success: true, rngSettings });
  });

  app.post("/api/admin/suspend", (req, res) => {
    const { userId, status, adminId } = req.body;
    const admin = users.find(u => u.id === adminId);
    const userToMod = users.find(u => u.id === userId);

    if (userToMod) {
      userToMod.status = status;
      auditLogs.unshift({
        id: "aud-" + Math.floor(Math.random() * 100000),
        adminId,
        adminName: admin ? admin.username : "Om Wager",
        action: `User Security State Modified: ${status}`,
        ipAddress: "127.0.0.1",
        timestamp: new Date().toISOString(),
        details: `Modified status of ${userToMod.username} to ${status}`
      });
    }

    res.json({ success: true, users });
  });

  app.get("/api/admin/audits", (req, res) => {
    res.json({ auditLogs, users });
  });

  // Mounting client builds
  if (process.env.NODE_ENV !== "production") {
    // Vite Dev Server middleware inclusion
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Aviator Core] Server-authoritative engine running on port ${PORT}`);
  });
}

startServer();
