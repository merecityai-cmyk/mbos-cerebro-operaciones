import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { aiTokenUsage } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

export async function GET() {
  await requireRole('manager')

  const [totals] = await db
    .select({
      inputTokens: sql<number>`COALESCE(SUM(input_tokens), 0)::int`,
      outputTokens: sql<number>`COALESCE(SUM(output_tokens), 0)::int`,
      cacheCreationTokens: sql<number>`COALESCE(SUM(cache_creation_tokens), 0)::int`,
      cacheReadTokens: sql<number>`COALESCE(SUM(cache_read_tokens), 0)::int`,
      callCount: sql<number>`COUNT(*)::int`,
    })
    .from(aiTokenUsage)

  const byJob = await db
    .select({
      jobType: aiTokenUsage.jobType,
      inputTokens: sql<number>`COALESCE(SUM(input_tokens), 0)::int`,
      outputTokens: sql<number>`COALESCE(SUM(output_tokens), 0)::int`,
      cacheReadTokens: sql<number>`COALESCE(SUM(cache_read_tokens), 0)::int`,
      callCount: sql<number>`COUNT(*)::int`,
    })
    .from(aiTokenUsage)
    .groupBy(aiTokenUsage.jobType)

  // Sonnet 4.6 pricing (USD per million tokens)
  const INPUT_PRICE = 3.0
  const OUTPUT_PRICE = 15.0
  const CACHE_CREATE_PRICE = 3.75
  const CACHE_READ_PRICE = 0.30

  const estimatedCostUsd =
    (totals.inputTokens / 1_000_000) * INPUT_PRICE +
    (totals.outputTokens / 1_000_000) * OUTPUT_PRICE +
    (totals.cacheCreationTokens / 1_000_000) * CACHE_CREATE_PRICE +
    (totals.cacheReadTokens / 1_000_000) * CACHE_READ_PRICE

  return NextResponse.json({ totals, byJob, estimatedCostUsd })
}
