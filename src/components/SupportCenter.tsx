/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { SupportTicket, SupportMessage, UserRole } from "../types.js";
import { MessageSquare, Upload, HelpCircle, AlertCircle, File, ChevronRight, CornerDownRight, CheckCircle2, RefreshCw, Send } from "lucide-react";

interface SupportCenterProps {
  userSession: any;
}

export default function SupportCenter({ userSession }: SupportCenterProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // New ticket form
  const [newSubject, setNewSubject] = useState<string>("");
  const [newCategory, setNewCategory] = useState<"Billing" | "Game Issue" | "Account Security" | "Referrals">("Billing");
  const [newMessage, setNewMessage] = useState<string>("");

  // Chat message input
  const [replyMessage, setReplyMessage] = useState<string>("");

  // File Upload Drop zone state
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadTickets = async () => {
    try {
      const response = await fetch("/api/support/tickets");
      const data = await response.json();
      setTickets(data.tickets);
      setMessages(data.messages);
      if (data.tickets.length > 0 && !activeTicketId) {
        setActiveTicketId(data.tickets[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Poll for simulated replies
  useEffect(() => {
    let interval: any;
    if (activeTicketId) {
      interval = setInterval(() => {
        loadTickets();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [activeTicketId]);

  // Scroll chats to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTicketId]);

  // Handle manual file browse click
  const triggerFileSearch = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDroppedFile(e.target.files[0]);
    }
  };

  // Drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setDroppedFile(e.dataTransfer.files[0]);
    }
  };

  // Open brand new Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject || !newMessage) return;

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userSession.id,
          subject: newSubject,
          category: newCategory,
          message: newMessage,
          attachmentName: droppedFile ? droppedFile.name : undefined
        })
      });

      const resData = await response.json();
      if (response.ok) {
        setNewSubject("");
        setNewMessage("");
        setDroppedFile(null);
        await loadTickets();
        setActiveTicketId(resData.ticket.id);
        alert(`Support ticket initialized! Case ID: ${resData.ticket.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reply to active thread
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage || !activeTicketId) return;

    try {
      const response = await fetch("/api/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: activeTicketId,
          senderName: userSession.username,
          senderRole: userSession.role,
          message: replyMessage,
          attachmentName: droppedFile ? droppedFile.name : undefined
        })
      });

      if (response.ok) {
        setReplyMessage("");
        setDroppedFile(null);
        await loadTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeTicket = tickets.find(t => t.id === activeTicketId);
  const activeChatMessages = messages.filter(m => m.ticketId === activeTicketId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[650px]">
      
      {/* Sidebar: Opened Tickets and Case creator panel */}
      <div className="lg:col-span-5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col overflow-hidden h-full">
        <div className="bg-slate-900 border-b border-slate-800 p-4 shrink-0">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-red-500" size={16} /> COMPLAINTS & FLIGHT DESK
          </h3>
          <p className="text-xs text-slate-500 mt-1">Submit ledger reviews or report aircraft HUD UI discrepancies.</p>
        </div>

        {/* Existing tickets list */}
        <div className="p-3 overflow-y-auto flex-1 space-y-2 border-b border-slate-850">
          <h4 className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase px-1 mb-2">ACTIVE RECORDED ISSUES</h4>
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTicketId(t.id)}
              className={`w-full p-3.5 rounded-xl border text-left transition ${
                t.id === activeTicketId
                  ? "bg-slate-900 border-red-900/50 text-white"
                  : "bg-slate-900/30 border-slate-900 text-slate-400 hover:border-slate-800"
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="font-semibold text-xs leading-tight line-clamp-1">{t.subject}</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase shrink-0 border ${
                  t.status === "Open"
                    ? "bg-green-950/40 border-green-900 text-green-400"
                    : t.status === "Pending"
                    ? "bg-amber-950/40 border-amber-900 text-amber-500 animate-pulse"
                    : "bg-slate-800 border-slate-700 text-slate-400"
                }`}>
                  {t.status}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
                <span>{t.category}</span>
                <span>Case #{t.id}</span>
              </div>
            </button>
          ))}
          {tickets.length === 0 && (
            <div className="text-center text-slate-500 py-10 text-xs">No active tickets filed.</div>
          )}
        </div>

        {/* Quick opening new ticket bottom segment */}
        <form onSubmit={handleCreateTicket} className="p-4 bg-slate-950 space-y-3 border-t border-slate-850">
          <h4 className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase">File New Case</h4>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Subject..."
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="bg-slate-900 border border-slate-850 py-1.5 px-3 rounded-lg text-xs text-white outline-none"
              required
            />
            <select
              value={newCategory}
              onChange={(e: any) => setNewCategory(e.target.value)}
              className="bg-slate-900 border border-slate-850 py-1.5 px-3 rounded-lg text-slate-400 focus:text-white text-xs outline-none"
            >
              <option value="Billing">Billing Issue</option>
              <option value="Game Issue">Game HUD Bug</option>
              <option value="Account Security">Security Verification</option>
              <option value="Referrals">Referrals Mismatch</option>
            </select>
          </div>
          <textarea
            placeholder="Describe transaction references..."
            rows={2}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="w-full bg-slate-900 border border-slate-850 py-1.5 px-3 rounded-lg text-xs text-white outline-none resize-none"
            required
          />

          {/* Draggable upload files inside bottom panel */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileSearch}
            className={`cursor-pointer group flex flex-col justify-center items-center py-2.5 px-3 border border-dashed rounded-lg text-center transition ${
              dragActive ? "border-red-600 bg-slate-900/50" : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/20"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {droppedFile ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                <File size={13} />
                <span className="truncate max-w-[150px]">{droppedFile.name}</span>
                <span className="text-[9px] text-slate-500">({(droppedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 group-hover:text-white px-3 py-1 rounded text-[10px] font-mono transition">
                <Upload size={10} /> Drag/Drop Attachment Image
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-red-600 hover:bg-red-500 font-bold rounded-lg text-white text-xs tracking-wider uppercase transition shadow-lg shadow-red-950/20"
          >
            SUBMIT VERIFICATION ISSUE
          </button>
        </form>
      </div>

      {/* Main chat log viewport on RSS */}
      <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col overflow-hidden h-full">
        {activeTicket ? (
          <>
            {/* Chat header */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 shrink-0 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest">{activeTicket.category} Ticket Thread</span>
                <h3 className="text-sm font-bold text-white mt-1">{activeTicket.subject}</h3>
              </div>
              <div className="text-[10px] font-mono text-slate-500 bg-slate-950 p-2 border border-slate-850 rounded">
                Ticket ID: <span className="text-white">#{activeTicket.id}</span>
              </div>
            </div>

            {/* Messaging scroll viewport */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              
              <div className="flex gap-2 items-start text-xs text-slate-500 pb-2 border-b border-slate-900">
                <AlertCircle size={14} className="text-slate-500 mt-0.5 shrink-0" />
                <p>This discussion loop is private and end-to-end audited. All ledger replies must reference system transaction IDs.</p>
              </div>

              {activeChatMessages.map((msg) => {
                const isAdminOrSupport = msg.senderRole === UserRole.SUPPORT || msg.senderRole === UserRole.ADMIN || msg.senderRole === UserRole.SUPER_ADMIN;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-[85%] ${
                      isAdminOrSupport ? "mr-auto flex-row" : "ml-auto flex-row-reverse text-right"
                    }`}
                  >
                    {/* Avatar initial */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none ${
                      isAdminOrSupport ? "bg-red-950 border border-red-900 text-red-500" : "bg-slate-800 border border-slate-700 text-white"
                    }`}>
                      {msg.senderName.charAt(0)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex gap-2 items-center text-[10px] text-slate-500">
                        <strong className="text-slate-300 font-semibold">{msg.senderName}</strong>
                        <span>{msg.senderRole}</span>
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      
                      <div className={`p-3 rounded-2xl text-xs text-slate-200 text-left leading-relaxed shadow ${
                        isAdminOrSupport
                          ? "bg-slate-900 border border-slate-850 rounded-tl-none"
                          : "bg-red-950/20 border border-red-900/30 text-slate-300 rounded-tr-none"
                      }`}>
                        {msg.message}

                        {/* File Attachment Pill */}
                        {msg.attachmentName && (
                          <div className="mt-2.5 p-1.5 rounded bg-slate-950/80 border border-slate-800 flex items-center gap-1.5 text-[9px] font-mono text-cyan-400">
                            <File size={10} className="text-cyan-400" />
                            <span className="truncate max-w-[200px]">{msg.attachmentName}</span>
                            <span className="text-slate-500 uppercase font-bold text-[8px]">Linked Attachment</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* In-chat quick reply forms inputs */}
            <form onSubmit={handleSendReply} className="p-4 bg-slate-900/60 border-t border-slate-850 flex gap-3 items-center">
              
              {/* Optional Drag indicator when attachment persists */}
              {droppedFile && (
                <div className="bg-slate-950 border border-slate-850 px-2 py-1 rounded flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 shrink-0">
                  <File size={11} />
                  <span className="max-w-[70px] truncate">{droppedFile.name}</span>
                  <button onClick={() => setDroppedFile(null)} className="text-red-500 font-bold font-mono hover:text-white ml-1">×</button>
                </div>
              )}

              <input
                type="text"
                placeholder="Enter message replies..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 py-2.5 px-3.5 rounded-xl text-xs text-white outline-none"
                required
              />
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-500 text-white p-2.5 rounded-xl transition shadow shadow-red-950 shrink-0"
              >
                <Send size={14} className="transform rotate-0" />
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-slate-500 py-20 text-center gap-2">
            <MessageSquare size={36} className="text-slate-700 animate-pulse" />
            <div className="text-sm font-semibold text-slate-400">No ticket discussion selected.</div>
            <p className="text-xs text-slate-600">Select an existing issue from LHS or submit a custom case.</p>
          </div>
        )}
      </div>
    </div>
  );
}
