export function Wordmark({ size = 30 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }} aria-label="Polyhose">
      Polyhose
    </span>
  );
}
