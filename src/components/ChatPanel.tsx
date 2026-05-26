"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { Message } from "@/types";
import { Spinner } from "./Spinner";

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

interface Props {
  messages: Message[];
  input: string;
  isGenerating: boolean;
  isFirstMessage: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onExampleClick: (example: string) => void;
}

export function ChatPanel({
  messages,
  input,
  isGenerating,
  isFirstMessage,
  inputRef,
  onInputChange,
  onSend,
  onStop,
  onExampleClick,
}: Props) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  return (
    <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col bg-gray-950">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isFirstMessage && !isGenerating ? (
          /* Examples */
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              サンプルアプリ
            </p>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => onExampleClick(ex)}
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
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSend();
            }}
            placeholder={
              isFirstMessage ? "どんなアプリを作りますか？" : "改善内容を入力..."
            }
            rows={isFirstMessage ? 4 : 3}
            className="flex-1 bg-gray-900 rounded-xl px-3.5 py-2.5 text-xs resize-none border border-gray-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 placeholder-gray-600 transition-colors leading-relaxed"
          />
          <button
            onClick={isGenerating ? onStop : onSend}
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
  );
}
