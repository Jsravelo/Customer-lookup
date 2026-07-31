// Stores generated customer briefs so the first viewer pays the generation
// cost and everyone after gets it instantly.
//
// Storage: Vercel Blob when BLOB_READ_WRITE_TOKEN is configured (durable,
// shared across serverless instances); otherwise a local .brief-cache folder
// (dev) / tmp dir (per-instance best effort).

import fs from 'fs'
import path from 'path'
import os from 'os'

export interface StoredBrief {
  brief: string
  updatedAt: string // ISO
}

const blobConfigured = () => !!process.env.BLOB_READ_WRITE_TOKEN

function localDir(): string {
  const dir = process.env.VERCEL
    ? path.join(os.tmpdir(), 'brief-cache')
    : path.join(process.cwd(), '.brief-cache')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

const blobPath = (contactId: string) => `briefs/${contactId}.json`
const localPath = (contactId: string) => path.join(localDir(), `${contactId}.json`)

export async function readBrief(contactId: string): Promise<StoredBrief | null> {
  // Local first (fast, also acts as a warm cache in front of Blob)
  try {
    const raw = fs.readFileSync(localPath(contactId), 'utf8')
    return JSON.parse(raw)
  } catch {
    // fall through
  }

  if (blobConfigured()) {
    try {
      const { head } = await import('@vercel/blob')
      const meta = await head(blobPath(contactId))
      const res = await fetch(meta.url, { cache: 'no-store' })
      if (res.ok) {
        const stored = (await res.json()) as StoredBrief
        try {
          fs.writeFileSync(localPath(contactId), JSON.stringify(stored))
        } catch {
          // best effort
        }
        return stored
      }
    } catch {
      // no blob stored
    }
  }
  return null
}

export async function writeBrief(contactId: string, brief: string): Promise<StoredBrief> {
  const stored: StoredBrief = { brief, updatedAt: new Date().toISOString() }
  try {
    fs.writeFileSync(localPath(contactId), JSON.stringify(stored))
  } catch {
    // best effort
  }
  if (blobConfigured()) {
    const { put } = await import('@vercel/blob')
    await put(blobPath(contactId), JSON.stringify(stored), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })
  }
  return stored
}
