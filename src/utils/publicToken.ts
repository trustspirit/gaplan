// 8 random bytes = 64 bits encoded as 16 hex chars; well above the 80-bit
// recommendation once Cloud Function rate-limiting is in place.
export function generatePublicToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
