/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, WalletState, GameRoundState, Bet, GameRngSettings, UserRole } from "./types.js";
import GameScreen from "./components/GameScreen.js";
import UserDashboard from "./components/UserDashboard.js";
import SupportCenter from "./components/SupportCenter.js";
import AdminPanel from "./components/AdminPanel.js";
import TechnicalBlueprints from "./components/TechnicalBlueprints.js";
import { Plane, Wallet, Shield, BookOpen, Users, HelpCircle, LogOut, Lock, ArrowUpRight, CheckCircle2, ChevronDown, Award, UsersRound, MessageSquareCode } from "lucide-react";

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<"landing" | "game" | "dashboard" | "support" | "admin" | "blueprints">("landing");

  // Authentication session state
  const [userSession, setUserSession] = useState<User | null>(null);
  const [userWallet, setUserWallet] = useState<WalletState>({ main: 0, bonus: 0, referral: 0, virtual: 10000 });
  const [authModal, setAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "otp">("login");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [otpInput, setOtpInput] = useState<string>("");

  // Game Real-Time state variables
  const [gameState, setGameState] = useState<{
    roundId: string;
    state: GameRoundState;
    countdown: number;
    currentMultiplier: number;
    simulatedActiveConnected: number;
    previousRounds: { id: string; crashPoint: number; timestamp: string }[];
    activeBets: Bet[];
  }>({
    roundId: "",
    state: GameRoundState.COUNTDOWN,
    countdown: 8.0,
    currentMultiplier: 1.00,
    simulatedActiveConnected: 73,
    previousRounds: [],
    activeBets: []
  });

  const [gameRngSettings, setGameRngSettings] = useState<GameRngSettings>({
    houseEdgePercent: 3.0,
    minCrashPoint: 1.00
  });

  // Load primary active user session session on boot
  const loadUserSession = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUserSession(data.user);
        setUserWallet(data.wallets);
      }
    } catch (e) {
      console.warn("Session retrieval failed. Login manually.", e);
    }
  };

  useEffect(() => {
    loadUserSession();
    
    // Query initial game settings
    fetch("/api/game/state")
      .then(res => res.json())
      .then(data => {
        setGameState({
          roundId: data.roundId,
          state: data.state,
          countdown: data.countdown,
          currentMultiplier: data.currentMultiplier,
          simulatedActiveConnected: data.simulatedActiveConnected,
          previousRounds: data.previousRounds,
          activeBets: data.activeBets
        });
        setGameRngSettings(data.rngSettings);
      })
      .catch(e => console.error("Initial load failed", e));
  }, []);

  // SSE Real-Time sync stream router
  useEffect(() => {
    const sse = new EventSource("/api/game/sse");

    sse.onmessage = (event) => {
      try {
        const packet = JSON.parse(event.data);
        const { event: sseEvent, payload } = packet;

        if (sseEvent === "welcome") {
          setGameState(prev => ({
            ...prev,
            roundId: payload.roundId,
            state: payload.state,
            countdown: payload.countdown,
            currentMultiplier: payload.currentMultiplier,
            previousRounds: payload.previousRounds,
            activeBets: payload.activeBets,
            simulatedActiveConnected: payload.simulatedActiveConnected
          }));
        } else if (sseEvent === "state_change") {
          setGameState(prev => ({
            ...prev,
            state: payload.state,
            roundId: payload.roundId || prev.roundId,
            countdown: typeof payload.countdown === "number" ? payload.countdown : prev.countdown,
            activeBets: payload.activeBets || prev.activeBets
          }));
        } else if (sseEvent === "countdown_tick") {
          setGameState(prev => ({ ...prev, countdown: payload.remaining }));
        } else if (sseEvent === "flying_tick") {
          setGameState(prev => ({
            ...prev,
            currentMultiplier: payload.multiplier,
            activeBets: payload.activeBets
          }));
        } else if (sseEvent === "player_bet") {
          setGameState(prev => {
            // Check if already exist
            if (prev.activeBets.some(b => b.id === payload.id)) return prev;
            return { ...prev, activeBets: [payload, ...prev.activeBets] };
          });
        } else if (sseEvent === "player_cashout") {
          setGameState(prev => ({
            ...prev,
            activeBets: prev.activeBets.map(b => 
              b.id === payload.betId 
                ? { ...b, status: "cashed_out", cashoutMultiplier: payload.multiplier, winAmount: payload.winAmount }
                : b
            )
          }));
        } else if (sseEvent === "crash") {
          setGameState(prev => ({
            ...prev,
            state: GameRoundState.CRASHED,
            currentMultiplier: payload.multiplier,
            previousRounds: payload.previousRounds,
            activeBets: prev.activeBets.map(b => b.status === "pending" ? { ...b, status: "lost" as const } : b)
          }));
        }
      } catch (err) {
        console.error("SSE Parsing Error", err);
      }
    };

    return () => {
      sse.close();
    };
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail) return;

    if (authMode === "login") {
      setAuthMode("otp"); // Simulate OTP Multi-factor for security compliance requirements
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });

      if (response.ok) {
        const data = await response.json();
        setUserSession(data.user);
        setUserWallet(data.wallets);
        setAuthModal(false);
        setOtpInput("");
        setAuthMode("login");
        alert(`Welcome authentication approved! Logged in as ${data.user.username}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    setUserSession(null);
    setUserWallet({ main: 0, bonus: 0, referral: 0, virtual: 10000 });
    setActiveTab("landing");
    alert("Wallet keys and user session revoked.");
  };

  // FAQ Expandable accordion states
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      
      {/* 1. Global Platform Navigation Header */}
      <header className="bg-slate-950 border-b border-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo brand */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("landing")}>
            <div className="w-9 h-9 rounded-lg bg-red-600 hover:bg-red-500 transition flex items-center justify-center text-white shadow shadow-red-950">
              <Plane className="transform -rotate-45" size={18} />
            </div>
            <div>
              <span className="font-sans font-black tracking-tighter text-white block leading-none text-base">AVIATOR_CORE</span>
              <span className="text-[9px] font-mono tracking-widest text-[#ef4444] block font-bold mt-1 uppercase">MULTIPLAYER HUD Prototype</span>
            </div>
          </div>

          {/* Core navigation anchors */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveTab("landing")}
              className={`px-3 py-2 font-semibold rounded-lg transition ${
                activeTab === "landing" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-white hover:bg-slate-900/50"
              }`}
            >
              Fliers Lounge
            </button>
            <button
              onClick={() => setActiveTab("game")}
              className={`px-3 py-2 font-semibold rounded-lg transition ${
                activeTab === "game" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-white hover:bg-slate-900/50"
              }`}
            >
              Cockpit Screen
            </button>
            {userSession && (
              <>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-3 py-2 font-semibold rounded-lg transition ${
                    activeTab === "dashboard" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                  }`}
                >
                  My Ledger Wallets
                </button>
                <button
                  onClick={() => setActiveTab("support")}
                  className={`px-3 py-2 font-semibold rounded-lg transition ${
                    activeTab === "support" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                  }`}
                >
                  Complaints Desk
                </button>
                {(userSession.role === UserRole.ADMIN || userSession.role === UserRole.SUPER_ADMIN) && (
                  <button
                    onClick={() => setActiveTab("admin")}
                    className={`px-3 py-2 font-semibold rounded-lg transition ${
                      activeTab === "admin" ? "bg-red-950/40 text-red-400 border border-red-900/30" : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                    }`}
                  >
                    Risk Controller
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => setActiveTab("blueprints")}
              className={`px-3 py-2 font-semibold rounded-lg tracking-wider text-xs border transition ${
                activeTab === "blueprints" ? "bg-[#ef4444] border-red-500 text-white" : "border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              System Blueprints
            </button>
          </nav>

          {/* Session controls button (Login / Profile menu) */}
          <div className="flex items-center gap-3">
            {userSession ? (
              <div className="flex items-center gap-3">
                <div className="hidden lg:block text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block font-mono">Ledger Ledger Cash</span>
                  <span className="text-sm font-black font-mono text-emerald-400 block">${userWallet.main.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 hover:scale-105 border border-slate-700 overflow-hidden cursor-pointer transition"
                  title="Profile settings"
                >
                  <img
                    src={userSession.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop"}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-red-500 transition"
                  title="Revoke session key"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModal(true)}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold font-sans transition hover:scale-[1.02] shadow-sm active:scale-[0.98]"
              >
                AUTHORIZE SESSION
              </button>
            )}
          </div>

        </div>
      </header>

      {/* 2. Main content scroll canvases */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        
        {/* VIEW 1: HERO LANDING LOUNGE */}
        {activeTab === "landing" && (
          <div className="space-y-16">
            
            {/* Display Hero Title Segment */}
            <div className="relative text-center max-w-4xl mx-auto pt-10 pb-6 space-y-6">
              <span className="text-xs font-mono font-bold tracking-widest text-red-500 bg-red-950/50 px-3.5 py-1.5 rounded-full border border-red-900/30">
                PROVABLY FAIR HIGH-FREQUENCY CASINO CRASH GAME ENGINE
              </span>
              <h1 className="text-4xl md:text-6xl font-sans font-black tracking-tight text-white leading-tight">
                Watch the Multiplier soar, cash out before <span className="text-red-500 underline">THE PLANE CRASH</span>
              </h1>
              <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Experience high-octane multiplayer stakes with our ledger statement wallet updates, instant demo mock accounts, interactive ticket complaints, and real-time flight path curves.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <button
                  onClick={() => userSession ? setActiveTab("game") : setAuthModal(true)}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold px-7 py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-red-950/40"
                >
                  ENTER COCKPIT SCREEN
                </button>
                <button
                  onClick={() => setActiveTab("blueprints")}
                  className="bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold px-7 py-3.5 rounded-xl text-xs uppercase border border-slate-800 hover:border-slate-700 transition"
                >
                  SYSTEM BLUEPRINTS ARCH
                </button>
              </div>

              {/* Float indicators */}
              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-12 font-mono text-xs select-none">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-900">
                  <span className="text-[10px] text-slate-500 uppercase">Multiplier Limit</span>
                  <strong className="text-white block mt-1">Unlimited</strong>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-900">
                  <span className="text-[10px] text-slate-500 uppercase">Certified Edge</span>
                  <strong className="text-emerald-400 block mt-1">3.00% House</strong>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-900">
                  <span className="text-[10px] text-slate-500 uppercase">Response Rate</span>
                  <strong className="text-white block mt-1">100ms Ticks</strong>
                </div>
              </div>
            </div>

            {/* Live Multiplier Preview Panel Block */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-900 max-w-xl mx-auto text-center space-y-4 shadow-xl">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest block">Live Multiplier Preview</span>
              <div className={`text-4xl md:text-5xl font-mono font-black py-4 transition ${
                gameState.state === GameRoundState.FLYING ? "text-amber-400" : gameState.state === GameRoundState.CRASHED ? "text-red-500" : "text-emerald-400"
              }`}>
                {gameState.state === GameRoundState.FLYING ? `${gameState.currentMultiplier.toFixed(2)}x` : gameState.state === GameRoundState.CRASHED ? `Flew Away @ ${gameState.currentMultiplier.toFixed(2)}x` : `Next Run in ${gameState.countdown.toFixed(1)}s`}
              </div>
              <div className="text-[10px] font-mono text-slate-400 flex justify-center items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" /> Connection Synchronized over SSE Protocol
              </div>
            </div>

            {/* Features list Bento grids */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-950/50 border border-red-900/40 flex items-center justify-center text-red-500 font-mono">
                  01
                </div>
                <h3 className="font-semibold text-white">Interactive Cockpit Animation</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  High frame-rate vector aircraft response displaying trails, particles, dynamic pitch angles and high performance canvas-based renderings.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-950/50 border border-red-900/40 flex items-center justify-center text-red-500 font-mono">
                  02
                </div>
                <h3 className="font-semibold text-white">High Fidelity Ledger Balances</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ledger statements tracking balance allocations, commissions, deposit simulations, banking, and CSV downloads.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-950/50 border border-red-900/40 flex items-center justify-center text-red-500 font-mono">
                  03
                </div>
                <h3 className="font-semibold text-white">Provably Fair HMAC Security</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cryptographically secure multiplier formulation utilizing server seed rolls, avoiding front-end coordinate manipulation.
                </p>
              </div>

            </div>

            {/* Expandable FAQs Accordion Accordions */}
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-center text-white font-sans">Frequently Answered Queries</h2>
              <div className="space-y-3">
                {[
                  {
                    q: "How does the Aviator Crash curve formulate crash points?",
                    a: "The game engine calculates the random multiplier target server-side using HMAC-SHA256 calculations factoring an rolling Server Seed and a sequence number. This ensures wagers are provably fair and verifiable post-round."
                  },
                  {
                    q: "What is the Double Betting panel feature?",
                    a: "Fliers are allowed to place up to two concurrent separate bets for the same flying cycle. They may configure independent wager dimensions and distinct auto-cashout multiplier limits per panel."
                  },
                  {
                    q: "What benefits does the Ledger-backed wallet provide?",
                    a: "Unlike typical client-side prototypes, the platform journals every balance action (bets, wins, deposits, or referral commission earnings) into an immutable ledger database with direct CSV export capabilities."
                  },
                  {
                    q: "Where can I find the complete database schema and Docker orchestration scripts?",
                    a: "Navigate to the 'System Blueprints' tab. It renders complete PRD/TRD reviews alongside detailed Prisma models, Nginx configurations, and Docker Compose scripts."
                  }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                      className="w-full p-4 text-left flex justify-between items-center text-sm font-semibold hover:bg-slate-850 transition text-slate-200"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        size={16}
                        className={`text-slate-400 transition-transform ${openFaqIdx === idx ? "transform rotate-180" : ""}`}
                      />
                    </button>
                    {openFaqIdx === idx && (
                      <div className="p-4 bg-slate-950 border-t border-slate-850 text-xs text-slate-400 leading-relaxed">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: GAME COCKPIT SCREEN */}
        {activeTab === "game" && (
          <div className="space-y-6">
            {!userSession && (
              <div className="bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
                <Lock size={32} className="text-slate-600 mx-auto animate-pulse" />
                <h3 className="font-semibold text-white text-base">Session Authorization Required</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  To place concurrent wagers on the double matching panels or synchronize with the active lobby feed, register a mock account.
                </p>
                <button
                  onClick={() => setAuthModal(true)}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono px-5 py-2.5 rounded-lg transition"
                >
                  AUTHORIZE SESSION NOW
                </button>
              </div>
            )}
            {userSession && (
              <GameScreen
                userSession={userSession}
                userWallet={userWallet}
                onWalletUpdate={setUserWallet}
                gameState={gameState}
              />
            )}
          </div>
        )}

        {/* VIEW 3: USER PROFILE WALLETS LEDGERS */}
        {activeTab === "dashboard" && userSession && (
          <UserDashboard
            userSession={userSession}
            userWallet={userWallet}
            onWalletUpdate={setUserWallet}
          />
        )}

        {/* VIEW 4: COMPLAINTS SUPPORT DESK */}
        {activeTab === "support" && userSession && (
          <SupportCenter userSession={userSession} />
        )}

        {/* VIEW 5: SECURITY RISK ADMINISTRATIVE OVERRIDES */}
        {activeTab === "admin" && userSession && (
          <AdminPanel
            userSession={userSession}
            gameRngSettings={gameRngSettings}
            onRngSettingsUpdate={setGameRngSettings}
          />
        )}

        {/* VIEW 6: TECHNICAL PLANNING SPEC BLUEPRINTS */}
        {activeTab === "blueprints" && (
          <TechnicalBlueprints />
        )}

      </main>

      {/* 3. Global Platform Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 mt-20 p-8 text-center text-xs text-slate-500 font-mono space-y-3">
        <p>© 2026 AVIATOR_CORE Platform. Compliant under Provably Fair Cryptography models.</p>
        <p className="text-[10px] text-slate-600">Running Host Container sandbox on Port 3000 | Built using React + Tailwind + Express.</p>
      </footer>

      {/* 4. Auth modal popup portal */}
      {authModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm relative shadow-2xl">
            
            <button
              onClick={() => setAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold font-mono"
            >
              ×
            </button>

            <div className="text-center mb-6">
              <span className="text-[10px] font-mono tracking-wider font-bold text-red-500 uppercase">ACCESS PROTOCOL</span>
              <h3 className="text-lg font-bold text-white mt-1">
                {authMode === "login" ? "Authorize Session" : authMode === "otp" ? "OTP Verification" : "Create Pilot Profile"}
              </h3>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {authMode !== "otp" ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">EMAIL ADDRESS</label>
                    <input
                      type="email"
                      placeholder="e.g. pilot@g.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 py-2 px-3 rounded-lg text-xs text-white outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">PASSWORD KEY</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 py-2 px-3 rounded-lg text-xs text-white outline-none"
                      required
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-red-950/30 border border-red-900/30 rounded-xl text-center text-xs text-red-400">
                    MFA verification triggered. Check mock device notifications.
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1 text-center">6-Digit OTP security code</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="1 2 3 4 5 6"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 py-2 px-3 rounded-lg text-center font-bold tracking-widest text-white outline-none"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 font-bold rounded-lg text-white text-xs tracking-wider uppercase transition shadow shadow-red-950/20"
              >
                {authMode === "login" ? "NEXT GATEWAY" : authMode === "otp" ? "SUBMIT PASSCODE" : "REGISTER PILOT"}
              </button>

              {authMode === "login" ? (
                <button
                  type="button"
                  onClick={() => setAuthMode("register")}
                  className="text-[10px] text-slate-400 hover:text-white block mx-auto pt-2 transition select-none"
                >
                  Need registration? Create new credentials profile.
                </button>
              ) : authMode === "register" ? (
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className="text-[10px] text-slate-400 hover:text-white block mx-auto pt-2 transition select-none"
                >
                  Already registered? Back to authorize portal.
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className="text-[10px] text-slate-400 hover:text-white block mx-auto pt-2 transition select-none"
                >
                  Back to Gateway form inputs.
                </button>
              )}
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
