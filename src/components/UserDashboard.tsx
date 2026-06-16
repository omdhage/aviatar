/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { WalletState, TransactionType, WalletLedgerEntry } from "../types.js";
import { Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, Share2, Clipboard, Users, FileSpreadsheet, Send, TrendingUp, Search, ShieldCheck } from "lucide-react";

interface UserDashboardProps {
  userSession: any;
  userWallet: WalletState;
  onWalletUpdate: (wallet: WalletState) => void;
}

export default function UserDashboard({ userSession, userWallet, onWalletUpdate }: UserDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<"wallet" | "banking" | "referrals" | "leaderboard">("wallet");

  // Wallet Form states
  const [depositAmount, setDepositAmount] = useState<string>("50");
  const [depositMethod, setDepositMethod] = useState<string>("UPI - Instant Transfer");
  const [depositBonus, setDepositBonus] = useState<boolean>(true);

  const [withdrawAmount, setWithdrawAmount] = useState<string>("100");
  const [withdrawMethod, setWithdrawMethod] = useState<string>("Bank NEFT");

  // Bank profile state
  const [bankName, setBankName] = useState<string>("Federal Capital Bank");
  const [accountNumber, setAccountNumber] = useState<string>("******2491");
  const [upiId, setUpiId] = useState<string>("omwager@axisbank");
  const [editBank, setEditBank] = useState<boolean>(false);

  // Search Ledger keyword
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [ledgers, setLedgers] = useState<WalletLedgerEntry[]>([]);

  // Clipboard copies
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Load real server ledger
  const fetchLedgers = async () => {
    try {
      const response = await fetch(`/api/wallet/ledger/${userSession.id}`);
      const data = await response.json();
      setLedgers(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLedgers();
  }, [userWallet, userSession]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userSession.id,
          amount: Number(depositAmount),
          method: depositMethod,
          bonusApplied: depositBonus
        })
      });
      const data = await response.json();
      if (response.ok) {
        onWalletUpdate(data.wallet);
        alert(`Deposit of $${depositAmount} simulated successfully! Balance credited into production ledger.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userSession.id,
          amount: Number(withdrawAmount),
          bankAccount: accountNumber,
          upi: upiId
        })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Simulated withdrawal error");
        return;
      }
      onWalletUpdate(data.wallet);
      alert(`Withdrawal processing queue locked for $${withdrawAmount}! Ledger balances updated.`);
    } catch (e) {
      console.error(e);
    }
  };

  // Convert Ledger statement arrays directly to client-side downloadable CSV blocks
  const exportLedgerToCsv = () => {
    if (ledgers.length === 0) return;
    const headers = "TransactionID,Timestamp,Type,Amount,PrevBalance,NewBalance,Description\n";
    const rows = ledgers.map(l => 
      `"${l.id}","${l.timestamp}","${l.type}",${l.amount},${l.previousBalance},${l.newBalance},"${l.description.replace(/"/g, '""')}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `aviator_ledger_statement_${userSession.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(`https://aviator-games.io/join?ref=${userSession.id}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredLedgers = ledgers.filter(item => 
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Wallet Balance Ribbons / Bento Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest">Main real account</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">${userWallet.main.toFixed(2)}</div>
            <span className="text-[9px] text-slate-400 mt-2 block">Ledger Audited Cash</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-950/40 border border-red-900/40 flex items-center justify-center">
            <Wallet className="text-red-500" size={20} />
          </div>
        </div>

        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest font-mono">Simulated practice</span>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">${userWallet.virtual.toFixed(2)}</div>
            <span className="text-[9px] text-slate-400 mt-2 block">Unlimited demo stake</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-950/30 border border-cyan-900/30 flex items-center justify-center">
            <TrendingUp className="text-cyan-400" size={20} />
          </div>
        </div>

        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest font-mono">COMMISSION CASH</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">${userWallet.referral.toFixed(2)}</div>
            <span className="text-[9px] text-emerald-500 mt-2 block">Referrals payouts ready</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-950/30 border border-emerald-900/30 flex items-center justify-center">
            <Users className="text-emerald-400" size={20} />
          </div>
        </div>

        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest font-mono">Bonus Credits</span>
            <div className="text-2xl font-bold font-mono text-purple-400 mt-1">${userWallet.bonus.toFixed(2)}</div>
            <span className="text-[9px] text-slate-400 mt-2 block">20% matching active</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-950/30 border border-purple-900/30 flex items-center justify-center">
            <Share2 className="text-purple-400" size={20} />
          </div>
        </div>
      </div>

      {/* Internal Navigation tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950 p-1.5 rounded-xl">
        <button
          onClick={() => setActiveSubTab("wallet")}
          className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition ${
            activeSubTab === "wallet" ? "bg-red-950/40 text-red-500 border border-red-900/30" : "text-slate-400 hover:text-white"
          }`}
        >
          Ledger Wallet Center
        </button>
        <button
          onClick={() => setActiveSubTab("banking")}
          className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition ${
            activeSubTab === "banking" ? "bg-red-950/40 text-red-500 border border-red-900/30" : "text-slate-400 hover:text-white"
          }`}
        >
          Banking Accounts
        </button>
        <button
          onClick={() => setActiveSubTab("referrals")}
          className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition ${
            activeSubTab === "referrals" ? "bg-red-950/40 text-red-500 border border-red-900/30" : "text-slate-400 hover:text-white"
          }`}
        >
          Referrals & Tree
        </button>
        <button
          onClick={() => setActiveSubTab("leaderboard")}
          className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition ${
            activeSubTab === "leaderboard" ? "bg-red-950/40 text-red-500 border border-red-900/30" : "text-slate-400 hover:text-white"
          }`}
        >
          Hall of Fliers
        </button>
      </div>

      {/* Panels Canvas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        
        {/* TAB 1: WALLET TRANSACTIONS AND LEDGERS */}
        {activeSubTab === "wallet" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Simulated Deposit form */}
              <form onSubmit={handleDeposit} className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-850">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ArrowUpRight className="text-emerald-500" /> SECURE LEDGER DEPOSIT SIMULATOR
                </h3>
                <div>
                  <label className="text-xs text-slate-400 font-mono block mb-1">DEPOSIT AMOUNT (USD)</label>
                  <input
                    type="number"
                    min="10"
                    max="10000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 py-2.5 px-3 rounded-lg text-white font-mono font-bold outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-mono">PAYMENT GATEWAY PORTAL</label>
                  <select
                    value={depositMethod}
                    onChange={(e) => setDepositMethod(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 py-2.5 px-3 rounded-lg text-slate-400 focus:text-white font-mono text-xs outline-none"
                  >
                    <option>UPI - Instant Transfer QR</option>
                    <option>Credit Card (Stripe secure proxy)</option>
                    <option>Direct Banking (ACH / FedWire)</option>
                    <option>Crypto (TRC-20 USDT Gateway)</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-400 hover:text-white mt-1">
                  <input
                    type="checkbox"
                    checked={depositBonus}
                    onChange={(e) => setDepositBonus(e.target.checked)}
                    className="accent-red-600 rounded"
                  />
                  Apply Aviator 20% Match Bonus Ledger Credits
                </label>
                <button
                  type="submit"
                  className="w-full py-3 bg-red-600 hover:bg-red-500 font-bold rounded-lg text-white text-xs tracking-wider uppercase transition shadow-lg shadow-red-950/20"
                >
                  TRIGGER MOCK TRANSACTION DEPOSIT
                </button>
              </form>

              {/* Simulated Withdrawal form */}
              <form onSubmit={handleWithdrawal} className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-850">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ArrowDownLeft className="text-amber-500 animate-bounce" /> INSTANT CASH WITHDRAWAL
                </h3>
                <div>
                  <label className="text-xs text-slate-400 font-mono block mb-1">WITHDRAW SUM (USD)</label>
                  <input
                    type="number"
                    min="20"
                    max={userWallet.main}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 py-2.5 px-3 rounded-lg text-white font-mono font-bold outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Maximum available: ${userWallet.main.toFixed(2)}</span>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-mono">TARGET BANK ACCOUNT / UPI HANDLE</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 py-2.5 px-3 rounded-lg text-white font-mono text-xs outline-none"
                    placeholder="Enter UPI or Bank account number"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={userWallet.main < Number(withdrawAmount)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-lg text-white text-xs tracking-wider uppercase transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  DISPATCH TO PROCESSING ENGINE
                </button>
              </form>

            </div>

            {/* Wallet transaction LED list with audit history */}
            <div className="bg-slate-950 rounded-2xl border border-slate-850 p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="text-emerald-400" /> LEDGER AUDIT TRAILS
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Every transaction is hashed and appended sequentially with balance statements.
                  </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search description..."
                      className="w-full bg-slate-900 border border-slate-800 pl-9 pr-3 py-1.8 rounded-lg text-xs text-white outline-none font-mono"
                    />
                  </div>
                  <button
                    onClick={exportLedgerToCsv}
                    className="flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 text-xs px-3 py-2 rounded-lg transition"
                  >
                    <FileSpreadsheet size={14} /> Export CSV
                  </button>
                </div>
              </div>

              {/* Table Ledger statements */}
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-right">Balance After</th>
                      <th className="py-3 px-4">Ledger Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {filteredLedgers.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-900/30">
                        <td className="py-3 px-4 text-slate-500">{l.id}</td>
                        <td className="py-3 px-4 text-slate-400">{new Date(l.timestamp).toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                            l.type === TransactionType.DEPOSIT || l.type === TransactionType.WIN
                              ? "bg-green-950/50 border-green-800 text-green-400"
                              : l.type === TransactionType.BET || l.type === TransactionType.WITHDRAWAL
                              ? "bg-red-950/30 border-red-900 text-red-500"
                              : "bg-purple-950/30 border-purple-900 text-purple-400"
                          }`}>
                            {l.type}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${l.amount >= 0 ? "text-green-400" : "text-red-500"}`}>
                          {l.amount >= 0 ? "+" : ""}${l.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">${l.newBalance.toFixed(2)}</td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={l.description}>{l.description}</td>
                      </tr>
                    ))}
                    {filteredLedgers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-500">No balance wagers or transaction records found matching filter constraints.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BANK CREDENTIALS GATEWAYS */}
        {activeSubTab === "banking" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-850 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="text-red-500" /> REGISTERED BANK CHANNELS
              </h3>
              <p className="text-xs text-slate-400">
                Define the primary gateway bank accounts to automate immediate withdrawal processing logic.
              </p>

              <div className="space-y-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-500 block uppercase">BANK PARTNER NAME</span>
                    {editBank ? (
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="bg-slate-950 text-white font-bold outline-none px-2 py-0.5 rounded border border-slate-800 text-right"
                      />
                    ) : (
                      <span className="text-white font-bold">{bankName}</span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-500 block uppercase">ACCOUNT NUMBER</span>
                    {editBank ? (
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="bg-slate-950 text-white font-bold outline-none px-2 py-0.5 rounded border border-slate-800 text-right"
                      />
                    ) : (
                      <span className="text-white font-bold">{accountNumber}</span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-500 block uppercase">UPI ADDRESS</span>
                    {editBank ? (
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="bg-slate-950 text-white font-bold outline-none px-2 py-0.5 rounded border border-slate-800 text-right"
                      />
                    ) : (
                      <span className="text-emerald-400 font-bold">{upiId}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 text-xs">
                  {editBank ? (
                    <button
                      onClick={() => setEditBank(false)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-lg transition"
                    >
                      Save Account Detail Updates
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditBank(true)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-bold text-white rounded-lg transition"
                    >
                      Modify Routing Accounts
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REFERRALS PLATFORM AND MULTI LEVEL INVITE TREE */}
        {activeSubTab === "referrals" && (
          <div className="space-y-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-850 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Share2 className="text-red-500" /> CASINO REFERRAL CENTER
                </h3>
                <p className="text-xs text-slate-400 mt-2">
                  Maximize passive earnings by distributing invitation tokens. Gain tiered shares: 15% from Direct invites (Tier-1), 5% from Tier-2 cascades.
                </p>

                {/* Invite link copying cards */}
                <div className="flex gap-2 mt-4 bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <input
                    type="text"
                    readOnly
                    value={`https://aviator-games.io/join?ref=${userSession.id}`}
                    className="flex-1 bg-transparent text-xs text-slate-300 font-mono select-all outline-none"
                  />
                  <button
                    onClick={handleCopyRef}
                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1 shrink-0"
                  >
                    <Clipboard size={12} /> {copiedLink ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl text-center border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono">TIER-1 RECRUITS</div>
                  <div className="text-lg font-bold font-mono text-white mt-1">4 Fliers</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl text-center border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono">TIER-2 RECRUITS</div>
                  <div className="text-lg font-bold font-mono text-white mt-1">11 Fliers</div>
                </div>
              </div>
            </div>

            {/* Tree hierarchy drawing node widgets */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-850 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Referral Network Map Visualizer</h4>
              <div className="flex flex-col items-center py-6">
                
                {/* Node Admin (Main user root) */}
                <div className="bg-red-950/70 border-2 border-red-600 p-4 rounded-xl text-center w-48 shadow-lg">
                  <div className="text-xs font-bold text-white">Om Wager (YOU)</div>
                  <div className="text-[9px] text-red-400 font-mono mt-1">SUPER ADMIN</div>
                  <div className="text-[10px] text-emerald-400 font-bold font-mono mt-1">+${userWallet.referral.toFixed(2)} Earned</div>
                </div>

                <div className="w-0.5 h-8 bg-slate-800" />

                {/* Level 1 invitations branches */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-2xl relative">
                  
                  {/* Left Invite */}
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-center flex flex-col items-center">
                    <div className="text-xs font-semibold text-slate-200">Captain_Aviator</div>
                    <span className="text-[8px] bg-indigo-950 text-indigo-400 border border-indigo-900 font-mono px-1.5 py-0.5 rounded mt-1 uppercase">Tier 1</span>
                    <span className="text-[9px] font-mono mt-2 text-slate-400">Yield: $94.20 commission</span>
                  </div>

                  {/* Mid Invite */}
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-center flex flex-col items-center">
                    <div className="text-xs font-semibold text-slate-200">SkyRider_Vegas</div>
                    <span className="text-[8px] bg-indigo-950 text-indigo-400 border border-indigo-900 font-mono px-1.5 py-0.5 rounded mt-1 uppercase">Tier 1</span>
                    <span className="text-[9px] font-mono mt-2 text-slate-400">Yield: $122.90 commission</span>
                  </div>

                  {/* Right Invite cascaded Tier 2 */}
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-center col-span-2 md:col-span-1 flex flex-col items-center">
                    <div className="text-xs font-semibold text-slate-200">TurbulenceBoy</div>
                    <span className="text-[8px] bg-indigo-950 text-indigo-400 border border-indigo-900 font-mono px-1.5 py-0.5 rounded mt-1 uppercase">Tier 1</span>
                    <div className="w-0.5 h-4 bg-slate-800 my-1" />
                    {/* Nested Tier 2 */}
                    <div className="bg-slate-950 border border-slate-800 p-2 rounded text-[10px] w-full text-center">
                      <div className="text-slate-300">AceRocket</div>
                      <span className="text-[7px] text-amber-500 font-mono uppercase bg-amber-950/20 px-1">Tier 2</span>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CASINO LEADERBOARD HALL OF FLIERS */}
        {activeSubTab === "leaderboard" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">Daily High Roller Scores</h3>
                <p className="text-xs text-slate-500 mt-1">Top players holding onto wagers to clear astronomical flight path crash limits.</p>
              </div>
              <span className="bg-red-950 text-red-500 border border-red-900/50 text-xs px-2.5 py-1 rounded-lg font-mono">Reset: 12 Hours</span>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-850 overflow-hidden text-xs">
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/40">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Wager Flyer</th>
                    <th className="py-3 px-4 text-center">Max Multiplier Cashout</th>
                    <th className="py-3 px-4 text-right">Profit Returned</th>
                    <th className="py-3 px-4 text-right">Flight Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-300">
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-bold text-red-500">🏆 1</td>
                    <td className="py-3 px-4 font-bold text-white">SkyRider_Vegas</td>
                    <td className="py-3 px-4 text-center font-bold text-amber-400">145.20x</td>
                    <td className="py-3 px-4 text-right text-green-400 font-bold">+$14,520.00</td>
                    <td className="py-3 px-4 text-right text-slate-500">Today, 02:11 am</td>
                  </tr>
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-bold text-amber-500">🥈 2</td>
                    <td className="py-3 px-4 font-bold text-white">Captain_Aviator</td>
                    <td className="py-3 px-4 text-center font-bold text-indigo-400">82.11x</td>
                    <td className="py-3 px-4 text-right text-green-400 font-bold">+$8,211.00</td>
                    <td className="py-3 px-4 text-right text-slate-500">Today, 06:45 am</td>
                  </tr>
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-bold text-blue-500">🥉 3</td>
                    <td className="py-3 px-4 font-bold text-white">MoonRider</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-300">41.80x</td>
                    <td className="py-3 px-4 text-right text-green-400 font-bold">+$4,180.00</td>
                    <td className="py-3 px-4 text-right text-slate-500">Today, 04:30 am</td>
                  </tr>
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-bold text-slate-500">4</td>
                    <td className="py-3 px-4 text-white">Satoshi_Flyer</td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-400">22.05x</td>
                    <td className="py-3 px-4 text-right text-green-450">+$2,205.00</td>
                    <td className="py-3 px-4 text-right text-slate-500">Yesterday, 11:21 pm</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
