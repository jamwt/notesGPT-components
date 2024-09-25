import { WorkpoolClient } from '../workpool/client';
import { internal } from './_generated/api';
import { app, internalAction, internalMutation } from './_generated/server';

const workpool = new WorkpoolClient(app.workpool);
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const theAction = internalAction({
  args: {},
  handler: async (ctx) => {
    await sleep(Math.floor(Math.random() * 12000));
    console.log('Hello');
  },
});

export const scheduleJobs = internalMutation({
  handler: async (ctx) => {
    for (let i = 0; i < 400; i++) {
      await workpool.runAction(ctx, internal.jobs.theAction, {});
    }
  },
});
