// convex/app.config.ts
import { defineApp } from 'convex/server';
import workpool from '../workpool/component.config';

const app = defineApp();

app.install(workpool, { args: { maxConcurrency: 25 } });

export default app;
