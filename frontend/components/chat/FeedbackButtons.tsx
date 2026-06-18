"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface FeedbackButtonsProps {
  messageId: string;
  conversationId: string;
}

export function FeedbackButtons({ messageId, conversationId }: FeedbackButtonsProps) {
  const [submitted, setSubmitted] = useState<"positive" | "negative" | null>(null);

  async function submit(rating: "positive" | "negative") {
    if (submitted) return;
    setSubmitted(rating);
    try {
      await api.post("/api/v1/feedback", { message_id: messageId, conversation_id: conversationId, rating });
    } catch {
      setSubmitted(null);
    }
  }

  if (submitted) {
    return (
      <span className="text-xs text-text-muted ml-2">
        {submitted === "positive" ? "Helpful" : "Noted"}
      </span>
    );
  }

  return (
    <div className="flex gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      <button
        onClick={() => submit("positive")}
        className="p-1 rounded text-text-muted hover:text-success transition-colors"
        title="Helpful"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        </svg>
      </button>
      <button
        onClick={() => submit("negative")}
        className="p-1 rounded text-text-muted hover:text-danger transition-colors"
        title="Not helpful"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
        </svg>
      </button>
    </div>
  );
}
