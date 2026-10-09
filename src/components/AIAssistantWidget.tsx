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
      // Send conversation history to API with streaming support
      const conversation = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const botId = `bot-${Date.now()}`;
      // Append initial placeholder bot message
      setMessages((prev) => [
        ...prev,
        {
          id: botId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);

      const res = await fetch("/api/ai/chat?stream=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ messages: conversation }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal menghubungi AI Assistant.");
      }

      if (!res.body) {
        throw new Error("Respons streaming tidak tersedia.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payloadStr = trimmed.slice(5).trim();
          if (!payloadStr) continue;

          try {
            const parsed = JSON.parse(payloadStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.delta) {
              accumulatedContent = parsed.delta;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              );
            } else if (parsed.done && parsed.reply) {
              accumulatedContent = parsed.reply;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              );
            }
          } catch (e) {
            // Ignore parse errors on stream boundaries
          }
        }
      }

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
          err.message || "Pastikan OPENAI_API_KEY telah diatur di .env."
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

  // Rich Markdown parser (supports tables, headers, lists, codeblocks, inline code, links, bold, italics)
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    // Split code blocks first
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, pIdx) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const codeLines = part.slice(3, -3).trim().split("\n");
        const lang = codeLines[0].match(/^[a-zA-Z0-9_-]+$/) ? codeLines[0] : "";
        const codeContent = lang ? codeLines.slice(1).join("\n") : codeLines.join("\n");
        return (
          <div key={pIdx} className="my-2 overflow-x-auto rounded-control bg-neutral-900 dark:bg-black p-3 text-xs text-neutral-100 font-mono">
            {lang && <div className="text-[10px] text-neutral-400 font-bold uppercase mb-1">{lang}</div>}
            <pre className="whitespace-pre">{codeContent}</pre>
          </div>
        );
      }

      // Process normal text block (tables, headers, lists, paragraphs)
      const lines = part.split("\n");
      const elements: React.ReactNode[] = [];
      let inTable = false;
      let tableRows: string[][] = [];

      const flushTable = (tIdx: number) => {
        if (tableRows.length === 0) return;
        const [headerRow, ...bodyRows] = tableRows;
        // Filter out markdown separator line (e.g. |---|---|)
        const validBodyRows = bodyRows.filter((r) => !r.every((c) => /^[-:\s]+$/.test(c)));

        elements.push(
          <div key={`table-${tIdx}`} className="my-2.5 overflow-x-auto rounded-control border border-rule">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/80 font-bold text-foreground border-b border-rule">
                <tr>
                  {headerRow.map((col, cIdx) => (
                    <th key={cIdx} className="px-2.5 py-1.5 border-r border-rule last:border-r-0 whitespace-nowrap">
                      {parseInlineMarkdown(col.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule bg-panel">
                {validBodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-muted/30">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-2.5 py-1.5 border-r border-rule last:border-r-0">
                        {parseInlineMarkdown(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      };

      lines.forEach((line, lIdx) => {
        const trimmed = line.trim();

        // Check if markdown table row (| col1 | col2 |)
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
          inTable = true;
          const cols = trimmed.slice(1, -1).split("|");
          tableRows.push(cols);
          return;
        } else if (inTable) {
          flushTable(lIdx);
        }

        // Headers (### Header)
        if (trimmed.startsWith("### ")) {
          elements.push(
            <h4 key={lIdx} className="font-bold text-xs sm:text-sm text-foreground mt-2 mb-1">
              {parseInlineMarkdown(trimmed.slice(4))}
            </h4>
          );
          return;
        }
        if (trimmed.startsWith("## ")) {
          elements.push(
            <h3 key={lIdx} className="font-bold text-sm text-foreground mt-2.5 mb-1">
              {parseInlineMarkdown(trimmed.slice(3))}
            </h3>
          );
          return;
        }

        // Bullet lists
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
          elements.push(
            <div key={lIdx} className="flex items-start gap-1.5 pl-2 py-0.5 text-xs sm:text-sm">
              <span className="text-primary mt-1 select-none font-bold text-[10px]">•</span>
              <span className="flex-1">{parseInlineMarkdown(trimmed.slice(2))}</span>
            </div>
          );
          return;
        }

        // Numbered lists (1. Item)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          elements.push(
            <div key={lIdx} className="flex items-start gap-1.5 pl-2 py-0.5 text-xs sm:text-sm">
              <span className="font-semibold text-muted-foreground select-none min-w-[16px] text-xs">
                {numMatch[1]}.
              </span>
              <span className="flex-1">{parseInlineMarkdown(numMatch[2])}</span>
            </div>
          );
          return;
        }

        // Empty spacer
        if (!trimmed) {
          elements.push(<div key={lIdx} className="h-1.5" />);
          return;
        }

        // Standard paragraph
        elements.push(
          <p key={lIdx} className="leading-relaxed py-0.5 text-xs sm:text-sm">
            {parseInlineMarkdown(line)}
          </p>
        );
      });

      if (inTable) {
        flushTable(lines.length);
      }

      return <React.Fragment key={pIdx}>{elements}</React.Fragment>;
    });
  };

  // Helper for inline markdown: bold, italic, inline code `code`
  const parseInlineMarkdown = (content: string) => {
    const parts = content.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((seg, sIdx) => {
      if (seg.startsWith("`") && seg.endsWith("`")) {
        return (
          <code key={sIdx} className="px-1 py-0.5 rounded bg-muted font-mono text-[11px] text-primary">
            {seg.slice(1, -1)}
          </code>
        );
      }
      if (seg.startsWith("**") && seg.endsWith("**")) {
        return <strong key={sIdx} className="font-bold text-foreground">{seg.slice(2, -2)}</strong>;
      }
      if (seg.startsWith("*") && seg.endsWith("*")) {
        return <em key={sIdx} className="italic">{seg.slice(1, -1)}</em>;
      }
      return seg;
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
          className="fixed bottom-20 md:bottom-5 right-4 md:right-5 z-40 flex items-center gap-2 rounded-full bg-primary px-3.5 py-2.5 md:px-4 md:py-3 text-xs md:text-sm font-semibold text-primary-foreground shadow-xl transition-all duration-200 hover:scale-105 hover:shadow-2xl active:scale-95 print:hidden group"
        >
          <Sparkles className="size-4 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
          <span>AI Assistant</span>
        </button>
      )}

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div
          className={cn(
            "fixed inset-x-3 bottom-20 md:inset-x-auto md:bottom-5 md:right-5 z-50 flex flex-col rounded-panel border border-rule bg-panel shadow-2xl transition-all duration-200 print:hidden overflow-hidden",
            isExpanded
              ? "h-[75vh] md:w-[680px] md:h-[85vh] md:max-h-[750px]"
              : "h-[65vh] max-h-[520px] md:w-[420px] md:h-[560px]"
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
