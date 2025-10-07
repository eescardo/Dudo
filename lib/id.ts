export function safeId(raw?: string) {
  return (raw || '').replace(/[^a-zA-Z0-9_-]/g, '');
}
