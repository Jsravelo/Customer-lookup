import { NextRequest, NextResponse } from 'next/server'
import { readBrief, writeBrief } from '@/lib/brief-cache'

export async function GET(req: NextRequest) {
  const contactId = req.nextUrl.searchParams.get('contactId')
  if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 })
  const stored = await readBrief(contactId)
  return NextResponse.json(stored ?? { brief: null })
}

export async function POST(req: NextRequest) {
  const { contactId, brief } = await req.json()
  if (!contactId || typeof brief !== 'string' || !brief.trim()) {
    return NextResponse.json({ error: 'contactId and brief required' }, { status: 400 })
  }
  const stored = await writeBrief(contactId, brief)
  return NextResponse.json(stored)
}
