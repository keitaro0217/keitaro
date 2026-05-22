"use client";

import { useState, useRef, useCallback } from "react";

const EXAMPLES = [
  "タスク管理アプリ（追加・削除・完了チェック付き）",
  "カラフルなアニメーション付き計算機",
  "リアルタイム文字カウンター付きメモ帳",
  "カウントダウンタイマー（ポモドーロ対応）",
  "カラーパレットジェネレーター",
  "BMI計算機（グラフ表示付き）",
];

export default function Home() {
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    if (!description.trim() || isGenerating) return;

    setIsGenerating(true);
    setCode("");
    setError("");
    setActiveTab("preview");

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "生成に失敗しました");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setCode(accumulated);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [description, isGenerating]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
  }, []);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
  }, [code]);

  const downloadCode = useCallback(() => {
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "app.html";
    a.click();
    URL.revokeObjectURL(url);
  }, [code]);

  const cleanCode = code.replace(/^```html\n?/, "").replace(/\n?```$/, "").trim();
  const hasOutput = cleanCode.length > 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-sm font-bold">
              A
            </div>
            <h1 className="text-lg font-semibold tracking-tight">AppForge</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              AI App Builder
            </span>
          </div>
          <p className="text-xs text-gray-500 hidden sm:block">
            アイデアを説明するだけでアプリが完成
          </p>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 gap-4">
        {/* Left Panel */}
        <div className="lg:w-80 flex flex-col gap-4">
          {/* Input */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex flex-col gap-3">
            <label className="text-sm font-medium text-gray-300">
              どんなアプリを作りますか？
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
              }}
              placeholder="例: タスク管理アプリ、電卓、タイマー..."
              className="w-full h-32 bg-gray-800 rounded-lg px-3 py-2.5 text-sm resize-none border border-gray-700 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder-gray-500 transition-colors"
            />
            <button
              onClick={isGenerating ? stop : generate}
              disabled={!description.trim() && !isGenerating}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isGenerating
                  ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                  : "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-red-400 animate-pulse" />
                  生成中... (クリックで停止)
                </span>
              ) : (
                "アプリを生成 ⌘Enter"
              )}
            </button>
          </div>

          {/* Examples */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">
              サンプル
            </p>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setDescription(ex)}
                  className="text-left text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors border border-transparent hover:border-gray-600"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          {hasOutput && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                生成情報
              </p>
              <div className="flex flex-col gap-1 text-xs text-gray-400">
                <span>{cleanCode.length.toLocaleString()} 文字</span>
                <span>
                  {cleanCode.split("\n").length.toLocaleString()} 行
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col min-h-[500px] lg:min-h-0">
          {!hasOutput && !isGenerating ? (
            <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center text-3xl mb-4">
                ✨
              </div>
              <h2 className="text-lg font-semibold text-gray-200 mb-2">
                アイデアをアプリに変換
              </h2>
              <p className="text-sm text-gray-500 max-w-xs">
                左のフォームにアプリのアイデアを入力すると、AIが完全に動作するWebアプリを自動生成します
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              {/* Tab Bar */}
              <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-800 bg-gray-900/50">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                    activeTab === "preview"
                      ? "bg-violet-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  プレビュー
                </button>
                <button
                  onClick={() => setActiveTab("code")}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                    activeTab === "code"
                      ? "bg-violet-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  コード
                </button>
                {hasOutput && (
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={copyCode}
                      className="px-3 py-1.5 text-xs rounded-md font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                      コピー
                    </button>
                    <button
                      onClick={downloadCode}
                      className="px-3 py-1.5 text-xs rounded-md font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                      DL
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === "preview" && (
                  <div className="w-full h-full relative">
                    {isGenerating && !hasOutput ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="w-2 h-2 rounded-full bg-violet-500 animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-gray-500">生成中...</p>
                      </div>
                    ) : (
                      <iframe
                        srcDoc={cleanCode}
                        className="w-full h-full border-0 bg-white"
                        sandbox="allow-scripts allow-forms allow-modals"
                        title="Generated App Preview"
                      />
                    )}
                  </div>
                )}
                {activeTab === "code" && (
                  <pre className="w-full h-full overflow-auto p-4 text-xs font-mono text-gray-300 leading-relaxed">
                    <code>{cleanCode || "生成中..."}</code>
                  </pre>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
