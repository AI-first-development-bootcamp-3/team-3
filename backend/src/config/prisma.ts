import { PrismaClient, Prisma } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env.js';

/**
 * Models that carry an `isActive` column and participate in the soft-delete
 * convention. Kept as an explicit list — rather than inferred from the DMMF —
 * so adding a new soft-deletable model is a deliberate, visible change here.
 */
const SOFT_DELETE_MODELS = new Set(['User', 'Client', 'Project', 'Task', 'Absence']);

/**
 * Rewrites `delete`/`deleteMany` into `update`/`updateMany { isActive: false }`,
 * and injects `isActive: true` into reads on soft-deletable models.
 *
 * Opt-out: pass `isActive: undefined` explicitly inside `where` to include
 * deactivated records (e.g. `where: { isActive: undefined }`) — an explicit
 * key in `where`, even set to `undefined`, is left untouched by this extension.
 */
function softDeleteExtension(base: PrismaClient) {
  return base.$extends({
    name: 'soft-delete',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          return query(withDefaultActiveFilter(model, args));
        },
        async findFirst({ model, args, query }) {
          return query(withDefaultActiveFilter(model, args));
        },
        async findUnique({ model, args, query }) {
          return query(withDefaultActiveFilter(model, args));
        },
        async count({ model, args, query }) {
          return query(withDefaultActiveFilter(model, args));
        },
        // `delete`/`deleteMany` are rewritten into an update against the base
        // (unextended) client — calling `query(args)` here would still run a
        // real DELETE, since the query component cannot change the operation.
        async delete({ model, args }) {
          if (!SOFT_DELETE_MODELS.has(model)) {
            return (base[modelAccessor(model)] as PrismaModelDelegate).delete(args);
          }
          return (base[modelAccessor(model)] as PrismaModelDelegate).update({
            where: args.where,
            data: { isActive: false },
          });
        },
        async deleteMany({ model, args }) {
          if (!SOFT_DELETE_MODELS.has(model)) {
            return (base[modelAccessor(model)] as PrismaModelDelegate).deleteMany(args);
          }
          return (base[modelAccessor(model)] as PrismaModelDelegate).updateMany({
            where: args.where,
            data: { isActive: false },
          });
        },
      },
    },
  });
}

interface PrismaModelDelegate {
  delete(args: unknown): Promise<unknown>;
  deleteMany(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  updateMany(args: unknown): Promise<unknown>;
}

function modelAccessor(model: string): keyof PrismaClient {
  return (model.charAt(0).toLowerCase() + model.slice(1)) as keyof PrismaClient;
}

function withDefaultActiveFilter<Model extends string, Args extends { where?: unknown }>(
  model: Model,
  args: Args,
): Args {
  if (!SOFT_DELETE_MODELS.has(model)) return args;

  const where = (args.where ?? {}) as Record<string, unknown>;
  if ('isActive' in where) return args;

  return { ...args, where: { ...where, isActive: true } };
}

declare global {
  var __prisma: ReturnType<typeof createPrismaClient> | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  const base = new PrismaClient({ adapter });
  return softDeleteExtension(base);
}

/**
 * Singleton Prisma client, guarded against connection-pool exhaustion when
 * `tsx watch` hot-reloads this module during development.
 */
export const prisma = globalThis.__prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export type { Prisma };
