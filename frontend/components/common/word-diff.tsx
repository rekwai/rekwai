import { diffWords } from "diff";

interface WordDiffProps {
  oldText: string;
  newText: string;
}

export function WordDiff({ oldText, newText }: WordDiffProps) {
  const changes = diffWords(oldText, newText);

  return (
    <span>
      {changes.map((part, i) => {
        if (part.removed) {
          return (
            <span
              key={i}
              className="line-through text-muted-foreground/60 px-0.5"
            >
              {part.value}
            </span>
          );
        }
        if (part.added) {
          return (
            <span
              key={i}
              className="bg-amber-50 text-amber-700 rounded px-0.5"
            >
              {part.value}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </span>
  );
}
