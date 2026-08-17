import { describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import type { RoleGuardHandler } from '../../middleware/auth.middleware.js';

/**
 * Express doesn't export types for its internal route stack, so this
 * describes just the shape this walker needs. See
 * openspec/changes/admin-api-authz/design.md for why reaching into
 * `app.router.stack` (an internal, not a public API - and specific to
 * Express 5; Express 4 exposed this as `app._router.stack` instead) is an
 * accepted trade-off here.
 */
interface RouteLayer {
  route?: { path: string; stack: RouteLayer[] };
  name?: string;
  handle?: { stack?: RouteLayer[] } & Partial<RoleGuardHandler>;
}

interface AdminRoute {
  path: string;
  hasGuard: boolean;
}

/** Walks a layer stack (recursing into mounted sub-routers) collecting every registered route path starting with `/admin` and whether any of its handlers carries the admin-guard marker. */
function collectAdminRoutes(stack: RouteLayer[]): AdminRoute[] {
  const found: AdminRoute[] = [];

  for (const layer of stack) {
    if (layer.route) {
      if (layer.route.path.startsWith('/admin')) {
        const hasGuard = layer.route.stack.some((handlerLayer) => handlerLayer.handle?.__isAdminRoleGuard === true);
        found.push({ path: layer.route.path, hasGuard });
      }
      continue;
    }

    if (layer.name === 'router' && layer.handle?.stack) {
      found.push(...collectAdminRoutes(layer.handle.stack));
    }
  }

  return found;
}

describe('admin route guard coverage', () => {
  it('every registered /admin route carries the admin role guard', () => {
    const appRouterStack = (app as unknown as { router: { stack: RouteLayer[] } }).router.stack;
    const adminRoutes = collectAdminRoutes(appRouterStack);

    // A change to adminUser.routes.ts that stops registering routes would
    // make this pass vacuously (no routes found = no failures) - guard
    // against that so the test can't silently go blind.
    expect(adminRoutes.length).toBeGreaterThan(0);

    const unguarded = adminRoutes.filter((route) => !route.hasGuard);
    expect(unguarded).toEqual([]);
  });
});
