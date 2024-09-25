import { v } from 'convex/values';
import { functions } from './_generated/api';
import {
  componentArg,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from './_generated/server';
import {
  FunctionHandle,
  FunctionReference,
  SchedulableFunctionReference,
} from 'convex/server';
import { makeActionRetrier } from 'convex-helpers/server/retries';
import { Doc } from './_generated/dataModel';

// in convex/utils.ts

export const { runWithRetries, retry } = makeActionRetrier('sched:retry');

// Eventually -- convex action retrier.

export const runNew = mutation({
  args: {
    ref: v.string(), // Function reference
    args: v.string(), // JSON-serialized arguments
  },

  handler: async (ctx, args) => {
    await ctx.db.insert('jobs', {
      functionRef: args.ref,
      args: args.args,
      state: 'waiting',
    });
    await ctx.scheduler.runAfter(0, functions.sched.runMore, {});
  },
});

// Increment and schedule. That thing OWNS! another mutation.
export const runMore = internalMutation({
  args: {},
  handler: async (ctx) => {
    const runningCount = await ctx.runQuery(functions.counter.get, {
      key: 'running',
    });

    const maxJobs = componentArg(ctx, 'maxConcurrency');
    // Maybe parallelize for whatever number aren't running here?
    if (maxJobs === undefined) {
      throw 'Defining the `maxConcurrency` component argument is required';
    }
    const gap = maxJobs - runningCount;
    console.log(`Gap is ${gap}`);
    if (gap <= 0) {
      // Can't run more.
      return;
    }

    // Claim it and schedule things.
    await ctx.runMutation(functions.counter.mod, { key: 'running', amt: gap });
    for (let i = 0; i < gap; i++) {
      await ctx.scheduler.runAfter(0, functions.sched.runOne, {});
    }
  },
});

// in a mutation or action
export const runOne = internalMutation({
  args: {},
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query('jobs')
      .withIndex('by_state', (q) => q.eq('state', 'waiting'))
      .order('asc')
      .first();
    if (job === null) {
      await ctx.runMutation(functions.counter.mod, { key: 'running', amt: -1 });
      return;
    }

    await ctx.db.patch(job._id, {
      state: 'running',
    });

    // Start running.
    await runWithRetries(ctx, functions.sched.runWrapper, { job: job._id });
  },
});

export const runWrapper = internalAction({
  args: {
    job: v.id('jobs'),
  },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(functions.sched.getJob, { job: args.job });
    if (job.state === 'done') {
      return;
    }

    const fref = job.functionRef;
    const argValues = JSON.parse(job.args);
    const startTime = Date.now();
    await ctx.runAction(fref as FunctionHandle<'action'>, argValues);
    const duration = Date.now() - startTime;
    await ctx.runMutation(functions.sched.finish, { duration, job: args.job });
  },
});

export const finish = internalMutation({
  args: {
    job: v.id('jobs'),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.job);
    // TODO -- handle failure.
    await ctx.db.patch(job!._id, {
      state: 'done',
      runtime: args.duration,
      finishTime: new Date().getTime(),
      outcome: "success", // XXX
    });
    await ctx.runMutation(functions.counter.mod, { key: 'running', amt: -1 });
    await ctx.scheduler.runAfter(0, functions.sched.runMore, {});
  },
});

export const getJob = internalQuery({
  args: {
    job: v.id('jobs'),
  },
  handler: async (ctx, args): Promise<Doc<'jobs'>> => {
    const job = await ctx.db.get(args.job);
    return job!;
  },
});
