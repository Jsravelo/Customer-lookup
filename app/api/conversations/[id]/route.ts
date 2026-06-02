import { NextRequest, NextResponse } from 'next/server'
import { getConversationsByContactId } from '@/lib/intercom'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversations = await getConversationsByContactId(params.id, 20)
    return NextResponse.json({ conversations })
  } catch (err) {
    console.error('[conversations]', err)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
}
