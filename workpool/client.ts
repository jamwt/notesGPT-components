import {
  createFunctionHandle,
  DefaultFunctionArgs,
  Expand,
  FilterApi,
  FunctionReference,
  FunctionVisibility,
  makeFunctionReference,
  Scheduler,
} from 'convex/server';
import { functions } from './_generated/api';

// Boilerplate from Lee... nice.
type InternalizeFunc<F extends FunctionReference<any, any, any, any>> =
  F['_visibility'] extends 'public'
    ? FunctionReference<
        F['_type'],
        'internal',
        F['_args'],
        F['_returnType'],
        F['_componentPath']
      >
    : F;
type InternalizePublicApi<API> = Expand<{
  [mod in keyof API as API[mod] extends FunctionReference<
    any,
    'public',
    any,
    any
  >
    ? mod
    : API[mod] extends FunctionReference<any, any, any, any>
      ? never
      : FilterApi<
            API[mod],
            FunctionReference<any, 'public', any, any>
          > extends Record<string, never>
        ? never
        : mod]: API[mod] extends FunctionReference<any, 'public', any, any>
    ? InternalizeFunc<API[mod]>
    : InternalizePublicApi<API[mod]>;
}>;
type InstalledWorkpool = InternalizePublicApi<typeof functions>;

export class WorkpoolClient {
  constructor(private client: InstalledWorkpool) {}
  async runAction<
    Action extends FunctionReference<
      'action',
      Visibility,
      Args,
      null | Promise<null> | void | Promise<void>
    >,
    Args extends DefaultFunctionArgs,
    Visibility extends FunctionVisibility = 'internal',
  >(ctx: { scheduler: Scheduler }, action: Action, actionArgs: Args) {
    const ref = await createFunctionHandle(action);
    const serializedArgs = JSON.stringify(actionArgs);
    await ctx.scheduler.runAfter(0, this.client.sched.runNew, {
      ref,
      args: serializedArgs,
    });
  }
}
