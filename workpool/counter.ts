import { v } from 'convex/values';
import { componentArg, mutation, query } from './_generated/server';

const SHARD_COUNT = 100;

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    let result = 0;
    const counters = await ctx.db
      .query('counters')
      .withIndex('by_key_and_shard', (q) => q.eq('key', key))
      .collect();
    for (const counter of counters) {
      result += counter.value;
    }
    return result;
  },
});

export const mod = mutation({
  args: { key: v.string(), amt: v.number() },
  handler: async (ctx, { key, amt }): Promise<number> => {
    console.log(`Mod is ${amt}`);
    const shard = Math.floor(Math.random() * SHARD_COUNT);
    const counter = await ctx.db
      .query('counters')
      .withIndex('by_key_and_shard', (q) => q.eq('key', key).eq('shard', shard))
      .first();
    if (counter !== null) {
      const net = counter.value + amt;
      await ctx.db.patch(counter._id, { value: net });
      return net;
    } else {
      await ctx.db.insert('counters', { key, shard, value: amt });
      return amt;
    }
  },
});
