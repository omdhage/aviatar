/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  GUEST = "Guest",
  REGISTERED = "Registered User",
  VIP = "VIP User",
  SUPPORT = "Support Agent",
  FINANCE = "Finance Manager",
  ADMIN = "Admin",
  SUPER_ADMIN = "Super Admin"
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  status: "active" | "suspended";
}

export enum WalletType {
  MAIN = "Main Balance",
  MAIN_VIRTUAL = "Virtual (Demo)",
  BONUS = "Bonus Cash",
  REFERRAL = "Referral Earnings"
}

export enum TransactionType {
  DEPOSIT = "Deposit",
  WITHDRAWAL = "Withdrawal",
  BET = "Bet Placed",
  WIN = "Win Cashout",
  BONUS = "Bonus Credit",
  REFERRAL = "Referral Commission",
  TRANSFER = "Wallet Transfer"
}

export interface WalletLedgerEntry {
  id: string;
  userId: string;
  timestamp: string;
  type: TransactionType;
  amount: number;
  currency: string;
  previousBalance: number;
  newBalance: number;
  description: string;
  referenceId?: string; // game round, ticket id, etc.
}

export interface WalletState {
  main: number;
  bonus: number;
  referral: number;
  virtual: number;
}

export enum GameRoundState {
  COUNTDOWN = "COUNTDOWN",
  FLYING = "FLYING",
  CRASHED = "CRASHED"
}

export interface GameRound {
  id: string;
  startTime: string;
  crashPoint: number;
  provablyFairSeed: string; // SHA256 of master seed + round number
  state: GameRoundState;
}

export interface Bet {
  id: string;
  userId: string;
  username: string;
  amount: number;
  isVirtual: boolean;
  betIndex: number; // 0 or 1 for double bet double-panels
  cashoutMultiplier?: number;
  winAmount?: number;
  timestamp: string;
  status: "pending" | "cashed_out" | "lost";
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: "Billing" | "Game Issue" | "Account Security" | "Referrals";
  status: "Open" | "Pending" | "Resolved";
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  timestamp: string;
  attachmentName?: string;
}

export interface ReferralNode {
  userId: string;
  username: string;
  role: UserRole;
  joinedAt: string;
  earningsGenerated: number;
  level: number; // For multi-level tree rendering
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  ipAddress: string;
  timestamp: string;
  details: string;
}

export interface GameRngSettings {
  houseEdgePercent: number; // Default 3.0%
  minCrashPoint: number;    // Usually 1.00
  fixedCrashPoint?: number; // Used for administration diagnostics / manual mode override
}
