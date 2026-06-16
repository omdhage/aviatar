/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, AdminAuditLog, UserRole, GameRngSettings } from "../types.js";
import { Shield, Users, Database, Percent, Settings, Sliders, AlertTriangle, Eye, Lock, Unlock, CheckCircle } from "lucide-react";

interface AdminPanelProps {
  userSession: any;
  gameRngSettings: GameRngSettings;
  onRngSettingsUpdate: (settings: GameRngSettings) => void;
}

export default function AdminPanel({ userSession, gameRngSettings, onRngSettingsUpdate }: AdminPanelProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<"controls" | "users" | "logs">("controls");

  // Rng Overrides states
  const [houseEdge, setHouseEdge] = useState<string>(String(gameRngSettings.houseEdgePercent));
  const [minCrash, setMinCrash] = useState<string>(String(gameRngSettings.minCrashPoint));
  const [fixedTarget, setFixedTarget] = useState<string>("");

  // Users tables
  const [userList, setUserList] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Search filter
  const [userSearchText, setUserSearchText] = useState<string>("");

  const loadAdminStatistics = async () => {
    try {
      const response = await fetch("/api/admin/audits");
      const data = await response.json();
      setAuditLogs(data.auditLogs);
      setUserList(data.users);
      if (data.users.length > 0 && !selectedUser) {
        setSelectedUser(data.users[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAdminStatistics();
  }, []);

  const handleUpdateRng = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/rng", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: userSession.id,
          houseEdgePercent: Number(houseEdge),
          minCrashPoint: Number(minCrash),
          fixedCrashPoint: fixedTarget ? Number(fixedTarget) : undefined
        })
      });

      const resData = await response.json();
      if (response.ok) {
        onRngSettingsUpdate(resData.rngSettings);
        alert("RNG parameters modified successfully on the running server! Watch the flight board curve respond on the next round.");
        loadAdminStatistics();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUserStatusUpdate = async (userId: string, targetStatus: "active" | "suspended") => {
    try {
      const response = await fetch("/api/admin/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: userSession.id,
          userId,
          status: targetStatus
        })
      });

      if (response.ok) {
        alert(`Account security mode successfully updated to ${targetStatus}!`);
        loadAdminStatistics();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = userList.filter(u => 
    u.username.toLowerCase().includes(userSearchText.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchText.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Real-time KPI panels */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-slate-300">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">TOTAL RETENTION TRAFFIC</span>
          <div className="text-2xl font-black font-mono mt-1">421 registered</div>
          <p className="text-[9px] text-slate-500 mt-2 block">Accumulated unique pilot indexes</p>
        </div>

        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-slate-300">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">HOURLY WAGERS LIABILITIES</span>
          <div className="text-2xl font-black font-mono text-amber-500 mt-1">11.8% ratio</div>
          <p className="text-[9px] text-slate-500 mt-2 block">Maximum calculated casino risk factor</p>
        </div>

        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-slate-300">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">Gross Deposits Vol</span>
          <div className="text-2xl font-black font-mono text-green-400 mt-1">$66,750 USD</div>
          <p className="text-[9px] text-slate-500 mt-2 block">Secured through local express ledgers</p>
        </div>

        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-slate-300">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">House GGR (PnL)</span>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-1">+$51,550.00</div>
          <p className="text-[9px] text-slate-500 mt-2 block">Audit status: Approved Compliant</p>
        </div>

      </div>

      {/* Navigation Sub tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950 p-1.5 rounded-xl">
        <button
          onClick={() => setActiveAdminTab("controls")}
          className={`flex-1 py-2 text-center text-xs font-mono font-semibold rounded-lg transition ${
            activeAdminTab === "controls" ? "bg-red-950/40 text-red-500 border border-red-900/30" : "text-slate-400 hover:text-white"
          }`}
        >
          RNG Risk Parameter Controls
        </button>
        <button
          onClick={() => setActiveAdminTab("users")}
          className={`flex-1 py-2 text-center text-xs font-mono font-semibold rounded-lg transition ${
            activeAdminTab === "users" ? "bg-red-950/40 text-red-500 border border-red-900/30" : "text-slate-400 hover:text-white"
          }`}
        >
          User Accounts Directory
        </button>
        <button
          onClick={() => setActiveAdminTab("logs")}
          className={`flex-1 py-2 text-center text-xs font-mono font-semibold rounded-lg transition ${
            activeAdminTab === "logs" ? "bg-red-950/40 text-red-500 border border-red-900/30" : "text-slate-400 hover:text-white"
          }`}
        >
          Immutable Admin Audit Trails
        </button>
      </div>

      {/* Main viewport panels */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-300">
        
        {/* TAB 1: CONTROLS & DIAGNOSTIC MODIFIERS */}
        {activeAdminTab === "controls" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-850 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="text-red-500" /> CASINO HOUSE RISK CONTROLLER
              </h3>
              <p className="text-xs text-slate-400">
                Calibrate global physics variables to restrict extreme payouts or enforce testing crash milestones.
              </p>

              <form onSubmit={handleUpdateRng} className="space-y-4 pt-2">
                
                {/* House edge selection */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400 font-semibold uppercase">House profit edge margin (%)</span>
                    <span className="text-red-500 font-bold">{houseEdge}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="0.5"
                    value={houseEdge}
                    onChange={(e) => setHouseEdge(e.target.value)}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer outline-none accent-red-600"
                  />
                  <span className="text-[10px] text-slate-500 block">Sets immediate instant-crash-at-1.00x random distribution chances raw ratio.</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 font-mono block mb-1">MINIMUM CRASH POINT MULTIPLIER</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1.00"
                      value={minCrash}
                      onChange={(e) => setMinCrash(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 py-2 px-3 rounded-lg text-white font-mono text-xs outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-450 font-mono block mb-1 text-amber-500 flex items-center gap-1">
                      <AlertTriangle size={12} className="animate-pulse" /> FIXED TARGET OVERRIDE (DIAGNOSTIC TEST)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="1.01"
                      placeholder="e.g. 2.50 (Leave blank to disable)"
                      value={fixedTarget}
                      onChange={(e) => setFixedTarget(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 py-2 px-3 rounded-lg text-amber-400 font-mono text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-red-600 hover:bg-red-500 font-bold rounded-lg text-white text-xs tracking-wider uppercase transition shadow-lg shadow-red-950/20"
                >
                  SAVE RISK CALIBRATION VARIABLES
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: USER DIRECTORY AUDIT PANEL */}
        {activeAdminTab === "users" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
            {/* LHS users search checklist */}
            <div className="lg:col-span-1 bg-slate-950 rounded-xl border border-slate-850 p-4 flex flex-col overflow-hidden h-full">
              <input
                type="text"
                placeholder="Search usernames..."
                value={userSearchText}
                onChange={(e) => setUserSearchText(e.target.value)}
                className="bg-slate-900 border border-slate-850 py-1.5 px-3 rounded-lg text-xs text-white outline-none w-full mb-3 font-mono"
              />
              <div className="overflow-y-auto flex-1 space-y-1.5 text-xs">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full p-2.5 rounded-lg border text-left flex justify-between items-center transition ${
                      selectedUser?.id === u.id
                        ? "bg-slate-900 border-red-900/50 text-white"
                        : "bg-slate-900/30 border-slate-900 text-slate-400 hover:border-slate-800"
                    }`}
                  >
                    <span>{u.username}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase border ${
                      u.status === "active" ? "bg-green-950/40 border-green-900 text-green-400" : "bg-red-950/40 border-red-900 text-red-500"
                    }`}>
                      {u.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* RHS Details viewport */}
            <div className="lg:col-span-2 bg-slate-950 rounded-xl border border-slate-850 p-6 overflow-y-auto h-full">
              {selectedUser ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-start border-b border-slate-900 pb-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">{selectedUser.username}</h4>
                      <p className="text-xs text-slate-400 mt-1">{selectedUser.email}</p>
                    </div>
                    <span className="bg-slate-900 border border-slate-800 text-[10px] font-mono px-2.5 py-1 rounded text-slate-400">
                      User ID: {selectedUser.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block uppercase mb-1">WAGER PERMISSIONS</span>
                      <strong className="text-white">{selectedUser.role}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase mb-1">REGISTRATION TIMELINES</span>
                      <strong className="text-white">{new Date(selectedUser.createdAt).toLocaleDateString()}</strong>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-900 space-y-4">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Administrative lockouts operations</h5>
                    <div className="flex gap-3">
                      {selectedUser.status === "active" ? (
                        <button
                          onClick={() => handleUserStatusUpdate(selectedUser.id, "suspended")}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-red-950/50 border border-red-900 text-red-400 font-bold font-mono hover:bg-red-950 rounded-xl text-xs transition"
                        >
                          <Lock size={14} /> SUSPEND ALL WALLET TRANSACTIONS
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserStatusUpdate(selectedUser.id, "active")}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-950/50 border border-emerald-900 text-emerald-400 font-bold font-mono hover:bg-emerald-950 rounded-xl text-xs transition"
                        >
                          <Unlock size={14} /> AUTHORIZE FULL ACCOUNT RECOVERY
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 py-10">Select an active account from LHS.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: IMMUTABLE AUDIT LOGS */}
        {activeAdminTab === "logs" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="text-red-500" /> SECURE STAFF RECORDS STATEMENT
              </h3>
              <span className="text-[10px] bg-slate-950 p-2 border border-slate-850 rounded text-slate-400 font-mono">TOTAL COMPLETED AUDITS: {auditLogs.length}</span>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/40">
                    <th className="py-3 px-4">Audit ID</th>
                    <th className="py-3 px-4">Admin Staff Name</th>
                    <th className="py-3 px-4">Action Event</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action Summary Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-300">
                  {auditLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-900/30">
                      <td className="py-3 px-4 text-slate-500">{l.id}</td>
                      <td className="py-3 px-4 font-bold text-white">{l.adminName}</td>
                      <td className="py-3 px-4 text-amber-500 font-semibold">{l.action}</td>
                      <td className="py-3 px-4 text-slate-400">{l.ipAddress}</td>
                      <td className="py-3 px-4 text-slate-400">{new Date(l.timestamp).toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={l.details}>{l.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
