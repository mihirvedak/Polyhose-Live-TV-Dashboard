export function BlockLoading({ text = 'Loading…' }: { text?: string }) {
  return <div className="block-empty">{text}</div>;
}
