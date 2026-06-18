export type MessageRole = "user" | "assistant" | "system";

export type ChatMode = "ai" | "human";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  confidence?: number;
  mode?: ChatMode;
  timestamp: string;
  retrieved_chunks?: RetrievedChunk[];
}

export interface RetrievedChunk {
  text: string;
  source_name: string;
  chunk_index: number;
  distance: number;
}

export type WSFrame =
  | { type: "connected"; session_id: string; conversation_id: string }
  | { type: "typing"; role: string }
  | { type: "message"; message_id: string; role: string; content: string; confidence: number; mode: ChatMode; timestamp: string }
  | { type: "escalation"; escalation_id: string; reason: string; message: string }
  | { type: "agent_joined"; agent_name: string; message: string }
  | { type: "resolved"; message: string }
  | { type: "quota_exceeded"; message: string }
  | { type: "error"; code: string; message: string }
  | { type: "pong" };

export interface KnowledgeSource {
  id: string;
  name: string;
  source_type: string;
  source_path: string | null;
  status: "pending" | "processing" | "active" | "failed";
  chunk_count: number;
  error_message: string | null;
  last_ingested_at: string | null;
  created_at: string;
}

export interface Escalation {
  id: string;
  conversation_id: string;
  reason: string;
  confidence_score: number | null;
  handoff_summary: string | null;
  status: "pending" | "assigned" | "resolved";
  assigned_agent: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface SummaryStats {
  total_queries: number;
  total_responses: number;
  avg_confidence: number;
  low_confidence_count: number;
  pending_escalations: number;
  resolution_rate: number;
}
