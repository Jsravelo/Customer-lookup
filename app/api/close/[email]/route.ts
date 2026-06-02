import { NextRequest, NextResponse } from 'next/server'
import { getFullLeadByEmail } from '@/lib/close'

export async function GET(
  _req: NextRequest,
  { params }: { params: { email: string } }
) {
  const email = decodeURIComponent(params.email)
  try {
    const lead = await getFullLeadByEmail(email)
    return NextResponse.json({ lead })
  } catch (err) {
    console.error('[close]', err)
    return NextResponse.json({ error: 'Failed to fetch Close data' }, { status: 500 })
  }
}
