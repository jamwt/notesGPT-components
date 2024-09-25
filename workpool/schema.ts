import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  counters: defineTable({
    key: v.string(),
    shard: v.number(),
    value: v.number(),
  }).index('by_key_and_shard', ['key', 'shard']),
  jobs: defineTable({
    functionRef: v.string(),
    args: v.string(),
    state: v.union(
      v.literal('running'),
      v.literal('waiting'),
      v.literal('done'),
    ),
    finishTime: v.optional(v.number()),
    runtime: v.optional(v.number()),
    outcome: v.optional(v.union(v.literal('success'), v.literal('failure'))),
  }).index('by_state', ['state']),
  stats: defineTable({
    calculatedAt: v.number(), // Date
    waiting: v.number(), // Count waiting
    running: v.number(), //
    queueLag: v.number(), // MS
    recentFailureRate: v.number(),
    recentWaitTimes: v.object({
      p99: v.number(),
      p95: v.number(),
      p75: v.number(),
      p50: v.number(),
    }),
    recentRunTimes: v.object({
      p99: v.number(),
      p95: v.number(),
      p75: v.number(),
      p50: v.number(),
    }),
  }),
});
