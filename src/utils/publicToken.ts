export function generatePublicToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 8)
}
