/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { GameRoundState, Bet, WalletState } from "../types.js";
import { Play, Volume2, VolumeX, ShieldCheck, HelpCircle, Users, Trophy, ChevronRight, Zap, Target } from "lucide-react";

interface GameScreenProps {
  userSession: any;
  userWallet: WalletState;
  onWalletUpdate: (wallet: WalletState) => void;
  gameState: {
    roundId: string;
    state: GameRoundState;
    countdown: number;
    currentMultiplier: number;
    simulatedActiveConnected: number;
    previousRounds: { id: string; crashPoint: number; timestamp: string }[];
    activeBets: Bet[];
  };
}

export default function GameScreen({ userSession, userWallet, onWalletUpdate, gameState }: GameScreenProps) {
  const { roundId, state, countdown, currentMultiplier, simulatedActiveConnected, previousRounds, activeBets } = gameState;

  // Sound Synth Controls
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [soundVolume, setSoundVolume] = useState<number>(0.3);

  // Sound Synthesizer Refs (using Web Audio API for custom procedurally-generated game audio cues)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);

  // Betting Board Local Stakes per panel
  const [wagerInputs, setWagerInputs] = useState<[number, number]>([10, 20]);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState<[boolean, boolean]>([false, false]);
  const [autoCashoutTargets, setAutoCashoutTargets] = useState<[number, number]>([2.0, 1.5]);
  const [autoBetEnabled, setAutoBetEnabled] = useState<[boolean, boolean]>([false, false]);
  
  // Track my active wagers placed in CURRENT COUNTDOWN/FLYING round
  const [myWagers, setMyWagers] = useState<Record<number, Bet | null>>({ 0: null, 1: null });
  const [loadingBet, setLoadingBet] = useState<[boolean, boolean]>([false, false]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Setup Web Audio Synthesizer Node
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  // Start continuous engine propeller sound when flying
  const startEngineSound = () => {
    if (!soundOn) return;
    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Cleanup prior
      stopEngineSound();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(30, ctx.currentTime); // Low engine idle rumble
      
      gain.gain.setValueAtTime(soundVolume * 0.15, ctx.currentTime);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      engineOscRef.current = osc;
      engineGainRef.current = gain;
    } catch (e) {
      console.warn("Audio start issues", e);
    }
  };

  // Stop Engine rumble
  const stopEngineSound = () => {
    if (engineOscRef.current) {
      try {
        engineOscRef.current.stop();
        engineOscRef.current.disconnect();
      } catch (e) {}
      engineOscRef.current = null;
    }
    if (engineGainRef.current) {
      try {
        engineGainRef.current.disconnect();
      } catch (e) {}
      engineGainRef.current = null;
    }
  };

  // Pitch adjustment based on current multiplier speed
  useEffect(() => {
    if (state === GameRoundState.FLYING && soundOn && engineOscRef.current) {
      try {
        const ctx = getAudioContext();
        // Propeller high-pitch scales exponentially alongside flight height progression (capped at 160Hz)
        const targetFreq = 30 + (currentMultiplier * 15);
        engineOscRef.current.frequency.exponentialRampToValueAtTime(Math.min(220, targetFreq), ctx.currentTime + 0.1);
      } catch (e) {}
    } else if (state !== GameRoundState.FLYING) {
      stopEngineSound();
    }
  }, [currentMultiplier, state, soundOn]);

  // Audio trigger on dynamic action transitions
  const triggerTickChime = () => {
    if (!soundOn) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Clean chime beep
      gain.gain.setValueAtTime(soundVolume * 0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  const triggerCashoutChime = () => {
    if (!soundOn) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5 (bright major chord)

      gain.gain.setValueAtTime(soundVolume * 0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  const triggerExplosionSubBoom = () => {
    if (!soundOn) return;
    try {
      const ctx = getAudioContext();
      // Low sub bass dynamic rumble
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(90, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.6);
      
      gain.gain.setValueAtTime(soundVolume * 0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.75);
    } catch (e) {}
  };

  // Sound triggers based on round states
  useEffect(() => {
    if (state === GameRoundState.FLYING) {
      startEngineSound();
    } else if (state === GameRoundState.CRASHED) {
      triggerExplosionSubBoom();
      stopEngineSound();
    }
  }, [state]);

  // Handle countdown triggers
  useEffect(() => {
    if (state === GameRoundState.COUNTDOWN && countdown > 0) {
      // Beep at whole seconds remaining
      if (Math.abs(countdown - Math.round(countdown)) < 0.05) {
        triggerTickChime();
      }
    }
  }, [countdown, state]);

  // Clean Audio Context on unmount
  useEffect(() => {
    return () => {
      stopEngineSound();
    };
  }, []);

  // Sync automatic bet triggers on countdown state shifts
  useEffect(() => {
    if (state === GameRoundState.COUNTDOWN) {
      // Clear last round's cached bets
      setMyWagers({ 0: null, 1: null });

      // If user enabled auto-bets, trigger them
      for (let panelIdx = 0; panelIdx < 2; panelIdx++) {
        if (autoBetEnabled[panelIdx]) {
          placeWagerOnEngine(panelIdx);
        }
      }
    }
  }, [state]);

  // Auto-cashout monitoring loops during Flight phase
  useEffect(() => {
    if (state === GameRoundState.FLYING) {
      for (let panelIdx = 0; panelIdx < 2; panelIdx++) {
        const activeBet = myWagers[panelIdx];
        if (activeBet && activeBet.status === "pending" && autoCashoutEnabled[panelIdx]) {
          const limit = autoCashoutTargets[panelIdx];
          if (currentMultiplier >= limit) {
            triggerCashoutOnEngine(panelIdx, activeBet.id);
          }
        }
      }
    }
  }, [currentMultiplier, state]);

  // Custom UI Canvas Airplane Trails drawer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = canvas.parentElement?.clientWidth || 700;
    let height = canvas.height = 360;

    let offset = 0;
    const particleList: { x: number; y: number; alpha: number; radius: number }[] = [];

    // Animation Loop
    const drawAnimation = () => {
      // Dark luxurious space layout background
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, width, height);

      // Grid Coordinate lines
      ctx.strokeStyle = "rgba(220, 38, 38, 0.04)";
      ctx.lineWidth = 1;
      
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (state === GameRoundState.COUNTDOWN) {
        // Draw idling floating target plane at bottom left (tilted up slightly)
        const planeX = 60;
        const planeY = height - 70 + Math.sin(Date.now() / 200) * 8;
        drawAirplane(ctx, planeX, planeY, -0.15);

        // Circular Loading progress arc
        ctx.beginPath();
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 6;
        ctx.arc(width / 2, height / 2 - 20, 50, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (8 - countdown) / 8));
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`TAKING OFF IN ${countdown.toFixed(1)}S`, width / 2, height / 2 + 55);
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "12px monospace";
        ctx.fillText(`WAITING FOR PILOT GATE`, width / 2, height / 2 + 75);

      } else if (state === GameRoundState.FLYING) {
        // Calculate progressive curve: starts slow, accelerates upwards elegantly
        // Using logarithmic/fractional-power model so the plane climbs beautifully right from low multipliers (e.g. 2.0x is well up in the sky)
        // and approaches the top right corner at high multipliers.
        const flightProgress = 1 - 1 / Math.pow(currentMultiplier, 0.7);
        const hoverOffset = Math.sin(Date.now() / 250) * 8; // adds a gentle hover/air turbulence movement
        
        const planeX = 60 + (width - 150) * flightProgress;
        const planeY = (height - 60) - (height - 120) * Math.pow(flightProgress, 1.2) + hoverOffset;

        // Create engine trailing smoke particles
        offset += 1;
        if (offset % 2 === 0) {
          particleList.push({
            x: planeX - 10,
            y: planeY + 8,
            alpha: 1.0,
            radius: 4 + Math.random() * 5
          });
        }

        // Draw trails curves
        ctx.beginPath();
        ctx.strokeStyle = "rgba(239, 68, 68, 0.85)"; // High glow Crimson Aviator line
        ctx.lineWidth = 5;
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 10;
        ctx.moveTo(60, height - 60);
        ctx.quadraticCurveTo(planeX / 2 + 30, height - 60, planeX, planeY + 12);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset shadow offset

        // Render particles smoke
        particleList.forEach((p, idx) => {
          ctx.beginPath();
          ctx.fillStyle = `rgba(239, 68, 68, ${p.alpha * 0.35})`;
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          
          p.x -= 2.5; // push leftwards (wind speed simulation)
          p.alpha -= 0.02;
          p.radius += 0.2;
        });

        // Cleanup stale particles
        while (particleList.length > 0 && particleList[0].alpha <= 0) {
          particleList.shift();
        }

        // Flight vector angle (tilts upward based on climb slope)
        const angle = -0.4 * (1 - flightProgress * 0.5);
        drawAirplane(ctx, planeX, planeY, angle);

        // Render current Pulsating large multiplier
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 56px Inter, sans-serif";
        ctx.textAlign = "center";
        const pulse = 1 + Math.sin(Date.now() / 150) * 0.03;
        ctx.save();
        ctx.translate(width / 2, height / 2 - 20);
        ctx.scale(pulse, pulse);
        ctx.fillText(`${currentMultiplier.toFixed(2)}x`, 0, 0);
        ctx.restore();

      } else if (state === GameRoundState.CRASHED) {
        // Render final explosion frames
        ctx.fillStyle = "#ef4444";
        ctx.font = "black 42px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("FLEW AWAY!", width / 2, height / 2 - 10);
        
        ctx.fillStyle = "rgba(239, 68, 68, 0.6)";
        ctx.font = "bold 28px monospace";
        ctx.fillText(`@ ${currentMultiplier.toFixed(2)}x`, width / 2, height / 2 + 30);

        // Flash of debris dust
        ctx.beginPath();
        ctx.fillStyle = "rgba(220, 38, 38, 0.1)";
        ctx.arc(width / 2, height / 2 - 15, 80 + Math.sin(Date.now() / 80) * 15, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId.current = requestAnimationFrame(drawAnimation);
    };

    drawAnimation();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [state, countdown, currentMultiplier]);

  // Canvas Vector airplane drawing function
  const drawAirplane = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Dynamic glow behind rocket engine
    ctx.beginPath();
    ctx.fillStyle = "rgba(239, 68, 68, 0.65)";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 15;
    ctx.arc(-15, 5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Airplane Body Shape
    ctx.fillStyle = "#ffffff"; // Sleek modern white metallic chassis
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(25, 5);  // Nose
    ctx.lineTo(0, 10);  // Lower fuselage
    ctx.lineTo(-12, 10);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();

    // Red wing accents
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.moveTo(5, 5);
    ctx.lineTo(-8, -14); // Upper wing span
    ctx.lineTo(-2, 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#b91c1c";
    ctx.beginPath();
    ctx.moveTo(5, 5);
    ctx.lineTo(-8, 22); // Lower wing span
    ctx.lineTo(-2, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // Place Bet over Express Port 3000 REST
  const placeWagerOnEngine = async (panelIdx: number) => {
    try {
      setLoadingBet(prev => {
        const copy = [...prev] as [boolean, boolean];
        copy[panelIdx] = true;
        return copy;
      });

      const betAmount = wagerInputs[panelIdx];

      const response = await fetch("/api/game/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userSession.id,
          amount: betAmount,
          isVirtual: false, // Always wagers against main real ledger for production gameplay simulation
          betIndex: panelIdx
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        alert(resData.error || "Wager placement failed");
        return;
      }

      // Update Local ledger state
      setMyWagers(prev => ({ ...prev, [panelIdx]: resData.bet }));
      
      // Notify parent widget to adjust main ledger visual counters
      onWalletUpdate(resData.wallet);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBet(prev => {
        const copy = [...prev] as [boolean, boolean];
        copy[panelIdx] = false;
        return copy;
      });
    }
  };

  // Cashout Active Wager
  const triggerCashoutOnEngine = async (panelIdx: number, betId: string) => {
    try {
      setLoadingBet(prev => {
        const copy = [...prev] as [boolean, boolean];
        copy[panelIdx] = true;
        return copy;
      });

      const response = await fetch("/api/game/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userSession.id,
          betId
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        alert(resData.error || "Cashout error");
        return;
      }

      // Play chime
      triggerCashoutChime();

      // Mark wager complete
      setMyWagers(prev => ({
        ...prev,
        [panelIdx]: {
          ...prev[panelIdx]!,
          status: "cashed_out",
          cashoutMultiplier: resData.multiplier,
          winAmount: resData.winAmount
        }
      }));

      // Update parent Wallet
      onWalletUpdate(resData.wallet);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBet(prev => {
        const copy = [...prev] as [boolean, boolean];
        copy[panelIdx] = false;
        return copy;
      });
    }
  };

  // Helpers to adjust wager increments
  const adjustWager = (panelIdx: number, operation: "+" | "-" | "double" | "half" | "set", value?: number) => {
    setWagerInputs(prev => {
      const copy = [...prev] as [number, number];
      const current = copy[panelIdx];
      if (operation === "+") copy[panelIdx] = current + (value || 5);
      if (operation === "-") copy[panelIdx] = Math.max(1, current - (value || 5));
      if (operation === "double") copy[panelIdx] = current * 2;
      if (operation === "half") copy[panelIdx] = Math.max(1, current / 2);
      if (operation === "set") copy[panelIdx] = value || 10;
      return copy;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 1. Left hand side: Multiplayer Current Stakes Sidebar (Lobby LED board) */}
      <div className="lg:col-span-1 bg-slate-950 rounded-xl border border-slate-800 flex flex-col overflow-hidden h-[630px]">
        {/* Sidebar Header */}
        <div className="bg-slate-900 border-b border-slate-800 p-4 shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono font-bold tracking-widest text-slate-400 flex items-center gap-1.5">
              <Users size={14} className="text-red-500" /> ACTIVE LOBBY
            </span>
            <span className="text-[10px] font-mono font-bold bg-green-950 text-green-400 px-2 py-0.5 rounded border border-green-800/40 animate-pulse">
              ● {simulatedActiveConnected} RIVAL FLIERS
            </span>
          </div>
          <div className="flex gap-2 mt-3">
            <div className="flex-1 text-center bg-slate-950 p-2 rounded border border-slate-850">
              <div className="text-[10px] text-slate-500 uppercase">Total Locked</div>
              <div className="text-xs font-bold font-mono text-white mt-0.5">
                ${activeBets.reduce((acc, b) => acc + (b.status === "pending" || b.status === "cashed_out" ? b.amount : 0), 0)}
              </div>
            </div>
            <div className="flex-1 text-center bg-slate-950 p-2 rounded border border-slate-850">
              <div className="text-[10px] text-slate-500 uppercase">Total Wins</div>
              <div className="text-xs font-bold font-mono text-green-400 mt-0.5">
                ${activeBets.reduce((acc, b) => acc + (b.winAmount || 0), 0).toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Bets Feed View lists */}
        <div className="p-2 overflow-y-auto flex-1 space-y-1.5 text-xs">
          {activeBets.map((item) => (
            <div
              key={item.id}
              className={`p-2 rounded flex justify-between items-center border transition ${
                item.status === "cashed_out"
                  ? "bg-green-950/20 border-green-900/40 text-slate-300"
                  : item.status === "lost"
                  ? "bg-slate-900/35 border-slate-900/35 text-slate-500"
                  : "bg-slate-900 border-slate-850 text-slate-200"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${item.status === "cashed_out" ? "bg-green-400" : "bg-red-500"}`} />
                <span className="font-medium max-w-[90px] truncate">{item.username}</span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span>${item.amount}</span>
                {item.status === "cashed_out" && (
                  <span className="bg-green-900/50 text-green-400 px-1 py-0.5 rounded text-[10px] font-bold">
                    {item.cashoutMultiplier}x
                  </span>
                )}
                {item.status === "lost" && (
                  <span className="text-red-500 text-[10px] line-through uppercase">Failed</span>
                )}
              </div>
            </div>
          ))}
          {activeBets.length === 0 && (
            <div className="text-slate-500 text-center py-10">Waiting for next betting cycle...</div>
          )}
        </div>
      </div>

      {/* 2. Right hand side: Game central monitor + Dual Betting Board */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        
        {/* Multiplier top ticker ribbon bar */}
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex items-center justify-between overflow-x-hidden min-h-[50px]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Trophy size={12} className="text-red-500" /> CURVE HISTORICS
            </span>
            <ChevronRight size={12} className="text-slate-700" />
          </div>
          <div className="flex gap-2 overflow-x-auto select-none no-scrollbar">
            {previousRounds.map((rnd) => (
              <span
                key={rnd.id}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition duration-150-ms ${
                  rnd.crashPoint >= 10.0
                    ? "bg-purple-950/50 border-purple-800 text-purple-300"
                    : rnd.crashPoint >= 2.0
                    ? "bg-indigo-950/40 border-indigo-900 text-indigo-300"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
                title={`Logged at ${new Date(rnd.timestamp).toLocaleTimeString()}`}
              >
                {rnd.crashPoint.toFixed(2)}x
              </span>
            ))}
          </div>
        </div>

        {/* Central visual flight Canvas */}
        <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner min-h-[360px]">
          <canvas ref={canvasRef} className="w-full h-full block" />
          
          {/* Audio volume setting badge floated top-right */}
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/85 backdrop-blur px-3 py-1.5 rounded-full border border-slate-800">
            <button
              onClick={() => {
                setSoundOn(!soundOn);
                if (soundOn) {
                  stopEngineSound();
                } else if (state === GameRoundState.FLYING) {
                  startEngineSound();
                }
              }}
              className="text-slate-400 hover:text-white transition"
              title={soundOn ? "Mute audio oscillators" : "Unmute procedural synthesisers"}
            >
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={soundVolume}
              onChange={(e) => setSoundOn(true) || setSoundVolume(Number(e.target.value))}
              className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer outline-none accent-red-600"
            />
          </div>

          {/* Secure Provably fair audit stamp floated top-left */}
          <div className="absolute top-4 left-4 flex items-center gap-1 bg-slate-900/85 backdrop-blur px-3 py-1.5 rounded-full border border-slate-800 text-[10px] font-mono text-emerald-400">
            <ShieldCheck size={12} className="text-emerald-400" />
            SHA256 CERTIFIED SECURE
          </div>
        </div>

        {/* Dual betting console layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((panelIdx) => {
            const activeWager = myWagers[panelIdx];
            const hasActiveBet = activeWager !== null;
            const isCompletedBet = hasActiveBet && activeWager?.status !== "pending";
            const currentSelectedValue = wagerInputs[panelIdx];

            return (
              <div 
                key={panelIdx} 
                className="bg-slate-950/80 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between"
                id={`bet_panel_${panelIdx}`}
              >
                {/* Panel Config Option Headings */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    <h4 className="text-xs font-mono font-bold text-slate-300">BET CONTAINER {panelIdx + 1}</h4>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <label className="flex items-center gap-1.5 text-slate-400 hover:text-white cursor-pointer transition select-none">
                      <input
                        type="checkbox"
                        checked={autoBetEnabled[panelIdx]}
                        onChange={(e) => setAutoBetEnabled(prev => {
                          const copy = [...prev] as [boolean, boolean];
                          copy[panelIdx] = e.target.checked;
                          return copy;
                        })}
                        className="rounded accent-red-600 cursor-pointer"
                      />
                      Auto Bet
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-400 hover:text-white cursor-pointer transition select-none">
                      <input
                        type="checkbox"
                        checked={autoCashoutEnabled[panelIdx]}
                        onChange={(e) => setAutoCashoutEnabled(prev => {
                          const copy = [...prev] as [boolean, boolean];
                          copy[panelIdx] = e.target.checked;
                          return copy;
                        })}
                        className="rounded accent-red-600 cursor-pointer"
                      />
                      Auto Out
                    </label>
                  </div>
                </div>

                {/* Grid controls */}
                <div className="grid grid-cols-12 gap-3 mb-4">
                  {/* Amount Controls */}
                  <div className="col-span-7 flex flex-col justify-center">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex items-center justify-between">
                      <button
                        onClick={() => adjustWager(panelIdx, "-")}
                        disabled={hasActiveBet}
                        className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-800 disabled:opacity-30 transition font-mono"
                      >
                        -
                      </button>
                      <div className="text-center flex-1">
                        <span className="text-[10px] text-slate-500 uppercase block font-mono">STAKE SUM</span>
                        <input
                          type="number"
                          value={currentSelectedValue}
                          onChange={(e) => adjustWager(panelIdx, "set", Number(e.target.value))}
                          disabled={hasActiveBet}
                          className="w-full bg-transparent text-center text-sm font-mono font-bold text-white outline-none"
                        />
                      </div>
                      <button
                        onClick={() => adjustWager(panelIdx, "+")}
                        disabled={hasActiveBet}
                        className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-800 disabled:opacity-30 transition font-mono"
                      >
                        +
                      </button>
                    </div>

                    {/* Quick values buttons */}
                    <div className="grid grid-cols-4 gap-1 mt-2">
                      {[10, 50, 100, 500].map((val) => (
                        <button
                          key={val}
                          onClick={() => adjustWager(panelIdx, "set", val)}
                          disabled={hasActiveBet}
                          className="py-1 text-[10px] font-mono rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-850 hover:text-white disabled:opacity-30 transition"
                        >
                          ${val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bet Trigger button Container */}
                  <div className="col-span-5 flex flex-col justify-between">
                    {!hasActiveBet ? (
                      <button
                        onClick={() => placeWagerOnEngine(panelIdx)}
                        disabled={state !== GameRoundState.COUNTDOWN || userWallet.main < currentSelectedValue || loadingBet[panelIdx]}
                        className={`w-full h-full rounded-xl flex flex-col items-center justify-center font-bold font-sans transition text-white shadow-lg ${
                          state === GameRoundState.COUNTDOWN
                            ? "bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-emerald-950/50"
                            : "bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        <span className="text-xs uppercase font-semibold">PLACE BET</span>
                        <span className="text-sm font-mono mt-0.5">${currentSelectedValue}</span>
                      </button>
                    ) : (
                      // Interactive Action buttons depending on state (Cashout / Lost / Waiting)
                      <>
                        {activeWager.status === "pending" ? (
                          <button
                            onClick={() => triggerCashoutOnEngine(panelIdx, activeWager.id)}
                            disabled={state !== GameRoundState.FLYING || loadingBet[panelIdx]}
                            className="w-full h-full rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex flex-col items-center justify-center font-bold font-sans animate-pulse px-2"
                          >
                            <span className="text-xs uppercase font-extrabold tracking-wider">CASHOUT</span>
                            <span className="text-sm font-mono mt-0.5">
                              ${(activeWager.amount * currentMultiplier).toFixed(2)}
                            </span>
                          </button>
                        ) : activeWager.status === "cashed_out" ? (
                          <div className="w-full h-full bg-green-950/60 border border-green-800 rounded-xl flex flex-col justify-center items-center p-2">
                            <span className="text-[10px] text-green-400 font-bold tracking-widest uppercase">WON</span>
                            <span className="text-sm text-green-300 font-bold font-mono mt-0.5">
                              +${activeWager.winAmount?.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-green-500 font-mono">
                              ({activeWager.cashoutMultiplier}x out)
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col justify-center items-center p-2 text-slate-500">
                            <span className="text-[10px] uppercase font-bold text-slate-600">Loss</span>
                            <span className="text-xs font-mono mt-1 font-semibold">${activeWager.amount} lost</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Auto Cashout multiplier input threshold */}
                {autoCashoutEnabled[panelIdx] && (
                  <div className="mt-2 bg-slate-900/60 border border-slate-850 p-2.5 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1 font-mono">
                      <Target size={12} className="text-amber-500 animate-spin" /> Target cashout multiplier
                    </span>
                    <input
                      type="number"
                      step="0.05"
                      min="1.01"
                      value={autoCashoutTargets[panelIdx]}
                      onChange={(e) => setAutoCashoutTargets(prev => {
                        const copy = [...prev] as [number, number];
                        copy[panelIdx] = Number(e.target.value);
                        return copy;
                      })}
                      className="w-16 bg-slate-950 border border-slate-800 text-right text-amber-400 font-bold font-mono px-1.5 py-0.5 rounded outline-none"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
