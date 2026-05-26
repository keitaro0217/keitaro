"use client";

import { Spinner } from "./Spinner";

interface Props {
  editableCode: string;
  isGenerating: boolean;
  hasOutput: boolean;
  activeTab: "preview" | "code";
  copied: boolean;
  error: string;
  onTabChange: (tab: "preview" | "code") => void;
  onCodeChange: (code: string) => void;
  onCopy: () => void;
  onDownload: () => void;
}

export function PreviewPanel({
  editableCode,
  isGenerating,
  hasOutput,
  activeTab,
  copied,
  error,
  onTabChange,
  onCodeChange,
  onCopy,
  onDownload,
}: Props) {
  if (!hasOutput && !isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-950">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/20 flex items-center justify-center text-5xl mb-6">
          ✨
        </div>
        <h2 className="text-2xl font-bold text-gray-200 mb-3">
          アイデアをアプリに
        </h2>
        <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
          左のチャットにアプリのアイデアを入力すると、AIが完全に動作するWebアプリを自動生成します。
          <br />
          <br />
          生成後は会話で繰り返し改善できます。コードを直接編集することもできます。
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2.5 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <button
          onClick={() => onTabChange("preview")}
          className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
            activeTab === "preview"
              ? "bg-violet-600 text-white shadow-sm"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
        >
          プレビュー
        </button>
        <button
          onClick={() => onTabChange("code")}
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
              onClick={onCopy}
              className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-all ${
                copied
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {copied ? "コピー済 ✓" : "コピー"}
            </button>
            <button
              onClick={onDownload}
              className="px-2.5 py-1.5 text-xs rounded-lg font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
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
            {isGenerating && hasOutput && (
              <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900/90 border border-gray-700 backdrop-blur-sm text-xs text-gray-300 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                生成中
              </div>
            )}
          </div>
        )}

        {activeTab === "code" && (
          <div className="w-full h-full flex flex-col">
            <div className="flex-shrink-0 px-4 py-2 bg-gray-900 border-b border-gray-800">
              <p className="text-xs text-gray-500">
                コードを直接編集できます。変更はプレビュータブに即座に反映されます。
              </p>
            </div>
            <textarea
              value={editableCode}
              onChange={(e) => onCodeChange(e.target.value)}
              className="flex-1 p-4 text-xs font-mono text-gray-300 bg-gray-950 resize-none border-0 focus:outline-none leading-relaxed"
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="flex-shrink-0 m-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
