interface Props {
  questions: { content: string; confidence_score: number }[];
}

export function TopQuestionsTable({ questions }: Props) {
  if (!questions.length) {
    return <p className="text-sm text-text-muted py-4 text-center">No escalated questions yet</p>;
  }

  return (
    <div className="divide-y divide-border/50">
      {questions.map((q, i) => (
        <div key={i} className="py-3 flex items-start gap-3">
          <span className="text-xs font-mono text-text-muted w-5 flex-shrink-0 mt-0.5">{i + 1}</span>
          <p className="flex-1 text-sm text-text-secondary leading-snug line-clamp-2">{q.content}</p>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
            (q.confidence_score ?? 0) < 0.3
              ? "bg-danger/15 text-danger"
              : "bg-warning/15 text-warning"
          }`}>
            {q.confidence_score != null ? `${(q.confidence_score * 100).toFixed(0)}%` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
