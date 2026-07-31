// Shared between the Edge middleware and the unlock route — Web Crypto only.
export async function authCookieValue(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}::zenmaid-customer-lookup`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
