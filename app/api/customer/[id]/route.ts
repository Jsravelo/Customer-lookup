import { NextRequest, NextResponse } from 'next/server'
import { getContactById } from '@/lib/intercom'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contact = await getContactById(params.id)
    return NextResponse.json({ contact })
  } catch (err) {
    console.error('[customer]', err)
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 })
  }
}
