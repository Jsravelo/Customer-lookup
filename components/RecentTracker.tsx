'use client'

import { useEffect } from 'react'
import { recordRecentCustomer } from './RecentCustomers'

// Invisible: records the visited customer into the per-browser recents list.
export default function RecentTracker({
  id,
  name,
  email,
}: {
  id: string
  name: string | null
  email: string | null
}) {
  useEffect(() => {
    recordRecentCustomer({ id, name, email })
  }, [id, name, email])
  return null
}
