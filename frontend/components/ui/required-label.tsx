export function RequiredLabel({ text }: { text: string }) {
  return (
    <>
      {text}
      <span className="text-semantic-error-fg" aria-hidden="true">
        *
      </span>
    </>
  );
}
