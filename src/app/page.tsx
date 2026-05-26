"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface HistoryItem {
  id: string;
  title: string;
  code: string;
  timestamp: number;
  userTexts: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAMPLES = [
  "タスク管理アプリ（追加・削除・完了チェック付き）",
  "カラフルなアニメーション付き計算機",
  "リアルタイム文字カウンター付きメモ帳",
  "カウントダウンタイマー（ポモドーロ対応）",
  "カラーパレットジェネレーター",
  "BMI計算機（グラフ表示付き）",
  "ミニゲーム（テトリス風ブロック崩し）",
  "家計簿アプリ（グラフ表示付き）",
];

const STORAGE_KEY = "appforge-history";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanHtml(raw: string): string {
  return raw
    .replace(/^```html\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

interface HistoryDrawerProps {
  items: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function HistoryDrawer({ items, onLoad, onDelete, onClose }: HistoryDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="absolute left-0 top-0 bottom-0 z-50 w-72 bg-gray-900 border-r border-gray-800 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <p className="text-sm font-semibold text-gray-200">生成履歴</p>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {items.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-10">
              履歴がありません
            </p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => onLoad(item)}
                className="group w-full text-left p-3 rounded-xl bg-gray-800 hover:bg-gray-750 border border-transparent hover:border-gray-600 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-200 truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(item.timestamp)}
                    </p>
                    {item.userTexts.length > 1 && (
                      <p className="text-xs text-gray-600 mt-0.5">
                        {item.userTexts.length} ターン
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-gray-600 hover:text-red-400 transition-all text-base mt-0.5"
                  >
                    ×
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // ── Actions ──────────────────────────────────────────────────────────────

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
      const next = [item, ...prev].slice(0, 30);
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
    // Reconstruct alternating user/assistant message pairs
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

  // ── Derived state ────────────────────────────────────────────────────────

  const hasOutput = editableCode.length > 0;
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const isFirstMessage = userMessageCount === 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Brand */}
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

          {/* Actions */}
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

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* History drawer */}
        {showHistory && (
          <HistoryDrawer
            items={history}
            onLoad={loadFromHistory}
            onDelete={deleteFromHistory}
            onClose={() => setShowHistory(false)}
          />
        )}

        {/* ── Chat panel ── */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col bg-gray-950">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isFirstMessage && !isGenerating ? (
              /* Examples list */
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  サンプルアプリ
                </p>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => {
                      setInput(ex);
                      inputRef.current?.focus();
                    }}
                    className="w-full text-left text-xs px-3.5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white transition-all border border-gray-800 hover:border-gray-600"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            ) : (
              /* Chat messages */
              <>
                {messages.map((msg, i) =>
                  msg.role === "user" ? (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[88%] px-3.5 py-2.5 rounded-2xl rounded-tr-md bg-violet-600 text-white text-xs leading-relaxed shadow-lg shadow-violet-900/30">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex justify-start">
                      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-tl-md bg-gray-800 text-xs text-gray-300">
                        <span className="text-emerald-400 text-sm">✓</span>
                        <span>アプリを生成しました</span>
                      </div>
                    </div>
                  )
                )}

                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-gray-800">
                      <Spinner />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-gray-800 p-3 space-y-2">
            {!isFirstMessage && (
              <p className="text-xs text-gray-600 px-1">
                改善要望を入力（例: ダークモードを追加して）
              </p>
            )}
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
                }}
                placeholder={
                  isFirstMessage
                    ? "どんなアプリを作りますか？"
                    : "改善内容を入力..."
                }
                rows={isFirstMessage ? 4 : 3}
                className="flex-1 bg-gray-900 rounded-xl px-3.5 py-2.5 text-xs resize-none border border-gray-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 placeholder-gray-600 transition-colors leading-relaxed"
              />
              <button
                onClick={isGenerating ? stop : send}
                disabled={!input.trim() && !isGenerating}
                title={isGenerating ? "停止" : "送信 (⌘Enter)"}
                className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center font-bold transition-all ${
                  isGenerating
                    ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
                    : "bg-gradient-to-br from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-violet-900/30"
                }`}
              >
                {isGenerating ? "■" : "↑"}
              </button>
            </div>
            <p className="text-xs text-gray-700 text-right pr-1">⌘Enter で送信</p>
          </div>
        </div>

        {/* ── Preview / Code panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!hasOutput && !isGenerating ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-950">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/20 flex items-center justify-center text-5xl mb-6">
                ✨
              </div>
              <h2 className="text-2xl font-bold text-gray-200 mb-3">
                アイデアをアプリに
              </h2>
              <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                左のチャットにアプリのアイデアを入力すると、AIが完全に動作する
                Webアプリを自動生成します。
                <br />
                <br />
                生成後は会話で繰り返し改善できます。
                コードを直接編集することもできます。
              </p>
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2.5 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    activeTab === "preview"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  プレビュー
                </button>
                <button
                  onClick={() => setActiveTab("code")}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    activeTab === "code"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  コード編集
                </button>

                {hasOutput && (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-gray-600 hidden md:block">
                      {editableCode.split("\n").length} 行 /{" "}
                      {editableCode.length.toLocaleString()} 文字
                    </span>
                    <button
                      onClick={copyCode}
                      className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-all ${
                        copied
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}
                    >
                      {copied ? "コピー済 ✓" : "コピー"}
                    </button>
                    <button
                      onClick={downloadCode}
                      className="px-2.5 py-1.5 text-xs rounded-lg font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                      DL
                    </button>
                  </div>
                )}
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-hidden">
                {/* Preview tab */}
                {activeTab === "preview" && (
                  <div className="w-full h-full relative">
                    {isGenerating && !hasOutput ? (
                      /* Initial loading state */
                      <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center gap-4">
                        <Spinner />
                        <p className="text-sm text-gray-500">生成中...</p>
                      </div>
                    ) : (
                      <iframe
                        srcDoc={editableCode}
                        className="w-full h-full border-0 bg-white"
                        sandbox="allow-scripts allow-forms allow-modals"
                        title="Generated App Preview"
                      />
                    )}
                    {/* Generating overlay badge */}
                    {isGenerating && hasOutput && (
                      <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900/90 border border-gray-700 backdrop-blur-sm text-xs text-gray-300 shadow-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                        生成中
                      </div>
                    )}
                  </div>
                )}

                {/* Code editor tab */}
                {activeTab === "code" && (
                  <div className="w-full h-full flex flex-col">
                    <div className="flex-shrink-0 px-4 py-2 bg-gray-900 border-b border-gray-800">
                      <p className="text-xs text-gray-500">
                        コードを直接編集できます。変更はプレビュータブに即座に反映されます。
                      </p>
                    </div>
                    <textarea
                      value={editableCode}
                      onChange={(e) => setEditableCode(e.target.value)}
                      className="flex-1 p-4 text-xs font-mono text-gray-300 bg-gray-950 resize-none border-0 focus:outline-none leading-relaxed"
                      spellCheck={false}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="flex-shrink-0 m-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
