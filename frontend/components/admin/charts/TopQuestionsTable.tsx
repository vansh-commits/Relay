interface Props {
  questions: { content: string; confidence_score: number }[];
}

export function TopQuestionsTable({ questions }: Props) {
  if (!questions.length) {
    return <p className="text-sm text-gray-400 py-4 text-center">No escalated questions yet</p>;
  }

  return (
    <div className="divide-y divide-border">
      {questions.map((q, i) => (
        <div key={i} className="py-3 flex items-start gap-3">
          <span className="text-xs font-mono text-gray-400 w-5 flex-shrink-0 mt-0.5">{i + 1}</span>
          <p className="flex-1 text-sm text-gray-700 leading-snug line-clamp-2">{q.content}</p>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
            (q.confidence_score ?? 0) < 0.3
              ? "bg-red-50 text-red-600"
              : "bg-amber-50 text-amber-700"
          }`}>
            {q.confidence_score != null ? `${(q.confidence_score * 100).toFixed(0)}%` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
