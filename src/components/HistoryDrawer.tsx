import type { HistoryItem } from "@/types";
import { formatDate } from "@/lib/html";

interface Props {
  items: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function HistoryDrawer({ items, onLoad, onDelete, onClose }: Props) {
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
                className="group w-full text-left p-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-transparent hover:border-gray-600 transition-all"
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
