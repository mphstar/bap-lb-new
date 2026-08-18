"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "📅 Rekap seluruh jadwal perkuliahan saya",
  "🔍 Cek jadwal yang belum memiliki dosen pengajar",
  "📝 Rangkum catatan materi BAP yang sudah terisi",
  "📌 Tampilkan catatan (notes) saya yang di-pin",
  "📊 Berapa total jadwal dan kelas yang saya ampu?",
];

export const AIAssistantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Halo! Saya asisten AI untuk sistem BAP & Jadwal Anda. Anda dapat menanyakan rekap jadwal, mengecek materi BAP, mencari jadwal kosong, atau meminta ringkasan data akademik Anda.",
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Send conversation history to API
      const conversation = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error || "Gagal mendapatkan respons dari AI Assistant."
        );
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: json.reply || "Tidak ada jawaban yang dihasilkan.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);

      // Automatically trigger real-time UI data refresh if AI inserted/modified any records
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("app-data-refresh"));
      }
    } catch (err: any) {
      console.error("AI Chat error:", err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Terjadi kendala: ${
          err.message || "Pastikan GEMINI_API_KEY telah diatur di .env."
        }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: "Percakapan telah direset. Ada yang bisa saya bantu terkait data BAP & jadwal Anda?",
        timestamp: new Date(),
      },
    ]);
  };

  // Format simple markdown (bold, lists, code, line breaks)
  const renderFormattedText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // Bold tags
      const formatted = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      return (
        <React.Fragment key={i}>
          <span
            dangerouslySetInnerHTML={{ __html: formatted }}
            className={line.startsWith("- ") || line.startsWith("• ") ? "block pl-3 py-0.5" : "block"}
          />
        </React.Fragment>
      );
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Buka AI Assistant"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-xl transition-all duration-200 hover:scale-105 hover:shadow-2xl active:scale-95 print:hidden group"
        >
          <Sparkles className="size-4 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
          <span>AI Assistant</span>
        </button>
      )}

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-50 flex flex-col rounded-panel border border-rule bg-panel shadow-2xl transition-all duration-200 print:hidden overflow-hidden",
            isExpanded
              ? "w-[calc(100vw-2.5rem)] sm:w-[680px] h-[85vh] max-h-[750px]"
              : "w-[calc(100vw-2.5rem)] sm:w-[420px] h-[560px]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-rule bg-panel-2 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight flex items-center gap-1.5">
                  <span>AI Assistant</span>
                  <span className="flex size-2 rounded-full bg-emerald-500" />
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Akses data BAP & Jadwal pribadi
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={resetChat}
                title="Reset percakapan"
              >
                <RotateCcw className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Perkecil" : "Perbesar"}
                className="hidden sm:inline-flex"
              >
                {isExpanded ? (
                  <Minimize2 className="size-3.5" />
                ) : (
                  <Maximize2 className="size-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsOpen(false)}
                title="Tutup"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="hm-scrollbar flex-1 overflow-y-auto p-4 space-y-3.5 bg-ground/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex gap-2.5 max-w-[90%]",
                  m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold mt-0.5",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground border border-rule"
                  )}
                >
                  {m.role === "user" ? (
                    <User className="size-3.5" />
                  ) : (
                    <Bot className="size-3.5 text-primary" />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-xs"
                      : "bg-panel border border-rule text-foreground rounded-tl-xs"
                  )}
                >
                  {renderFormattedText(m.content)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 mr-auto max-w-[90%]">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-foreground border border-rule mt-0.5">
                  <Bot className="size-3.5 text-primary" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs bg-panel border border-rule px-3.5 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  <span>Sedang memproses data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && !loading && (
            <div className="border-t border-rule/50 bg-panel px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                Rekomendasi Pertanyaan:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.slice(0, 3).map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="rounded-full border border-rule bg-panel-2 hover:bg-accent px-2.5 py-1 text-[11px] text-foreground transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="border-t border-rule bg-panel p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanyakan jadwal, rekap BAP, atau data Anda... (Enter untuk kirim)"
                rows={1}
                className="hm-scrollbar max-h-24 min-h-[38px] flex-1 resize-none rounded-control border border-rule bg-background px-3 py-2 text-xs sm:text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !input.trim()}
                className="shrink-0 size-9"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
