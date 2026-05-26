"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Message, HistoryItem } from "@/types";
import { cleanHtml } from "@/lib/html";
import { loadHistory, saveHistory } from "@/lib/history";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { ChatPanel } from "@/components/ChatPanel";
import { PreviewPanel } from "@/components/PreviewPanel";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [editableCode, setEditableCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const pushHistory = useCallback((msgs: Message[], code: string) => {
    const userTexts = msgs
      .filter((m) => m.role === "user")
      .map((m) => m.content);
    const title = userTexts[0]?.slice(0, 40) ?? "無題のアプリ";
    const item: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      code,
      timestamp: Date.now(),
      userTexts,
    };
    setHistory((prev) => {
      const next = [item, ...prev];
      saveHistory(next);
      return next;
    });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isGenerating) return;

    const userMsg: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsGenerating(true);
    setError("");
    setActiveTab("preview");

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          currentCode: editableCode || undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "生成に失敗しました");
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let raw = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += dec.decode(value, { stream: true });
        setEditableCode(cleanHtml(raw));
      }

      const finalCode = cleanHtml(raw);
      const finalMessages: Message[] = [
        ...nextMessages,
        { role: "assistant", content: raw },
      ];
      setMessages(finalMessages);
      setEditableCode(finalCode);
      pushHistory(finalMessages, finalCode);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [input, messages, editableCode, isGenerating, pushHistory]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
  }, []);

  const newSession = useCallback(() => {
    stop();
    setMessages([]);
    setEditableCode("");
    setError("");
    setActiveTab("preview");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [stop]);

  const loadFromHistory = useCallback((item: HistoryItem) => {
    // Reconstruct conversation from stored user messages
    const msgs: Message[] = item.userTexts.flatMap((text, i) => [
      { role: "user" as const, content: text },
      ...(i < item.userTexts.length - 1
        ? [{ role: "assistant" as const, content: "[previous generation]" }]
        : []),
    ]);
    setMessages(msgs);
    setEditableCode(item.code);
    setShowHistory(false);
    setActiveTab("preview");
  }, []);

  const deleteFromHistory = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(editableCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [editableCode]);

  const downloadCode = useCallback(() => {
    const blob = new Blob([editableCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "app.html";
    a.click();
    URL.revokeObjectURL(url);
  }, [editableCode]);

  const hasOutput = editableCode.length > 0;
  const isFirstMessage = messages.filter((m) => m.role === "user").length === 0;

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-violet-500/20">
              A
            </div>
            <span className="font-semibold tracking-tight text-gray-100">
              AppForge
            </span>
            <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              AI App Builder
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-colors"
            >
              履歴{history.length > 0 ? ` (${history.length})` : ""}
            </button>
            {!isFirstMessage && (
              <button
                onClick={newSession}
                className="px-3 py-1.5 text-xs rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 transition-colors"
              >
                + 新規
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {showHistory && (
          <HistoryDrawer
            items={history}
            onLoad={loadFromHistory}
            onDelete={deleteFromHistory}
            onClose={() => setShowHistory(false)}
          />
        )}

        <ChatPanel
          messages={messages}
          input={input}
          isGenerating={isGenerating}
          isFirstMessage={isFirstMessage}
          inputRef={inputRef}
          onInputChange={setInput}
          onSend={send}
          onStop={stop}
          onExampleClick={(ex) => {
            setInput(ex);
            inputRef.current?.focus();
          }}
        />

        <PreviewPanel
          editableCode={editableCode}
          isGenerating={isGenerating}
          hasOutput={hasOutput}
          activeTab={activeTab}
          copied={copied}
          error={error}
          onTabChange={setActiveTab}
          onCodeChange={setEditableCode}
          onCopy={copyCode}
          onDownload={downloadCode}
        />
      </div>
    </div>
  );
}
