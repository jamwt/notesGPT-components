import { defineComponent } from 'convex/server';
import { v } from 'convex/values';
export default defineComponent('workpool', {
  args: {
    maxConcurrency: v.number(),
  },
});


