// Per-request memoization so multiple server components on the same page
// (status strip, timeline, panels) share one fetch per source.
import { cache } from 'react'
import { getBillingByEmail } from './stripe'
import { listConversationSummaries, getCompanyAttributes } from './intercom'
import { getFullLeadByEmail } from './close'
import { getFathomCalls } from './fathom'
import { searchSlack } from './slack'

export const cachedBilling = cache((email: string) => getBillingByEmail(email).catch(() => null))
export const cachedConversations = cache((contactId: string) =>
  listConversationSummaries(contactId, 60).catch(() => [])
)
export const cachedLead = cache((email: string) => getFullLeadByEmail(email).catch(() => null))
export const cachedFathom = cache((email: string) => getFathomCalls(email).catch(() => null))
export const cachedSlack = cache((email: string) => searchSlack(email, 40).catch(() => null))
export const cachedCompany = cache((contactId: string) =>
  getCompanyAttributes(contactId).catch(() => null)
)
