export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  code: string;
  timestamp: number;
  userTexts: string[];
}
