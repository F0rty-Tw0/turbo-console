import type { Route } from '@playwright/test';

export type RouteHandler = (route: Route) => Promise<void>;
