import * as Sentry from '@sentry/nextjs';
import { logger } from './logger';
import { createSystemLog } from '@/lib/prisma';

export interface ErrorContext {
  service?: string;
  action?: string;
  actor?: string;
  ip?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
}

const isSentryConfigured = Boolean(
  process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
);

/**
 * Universal Error Capture & Diagnostics Reporter
 * Dispatches to Sentry (when configured), Pino structured log, and database SystemLog table.
 */
export async function captureError(
  error: unknown,
  context: ErrorContext = {}
): Promise<string> {
  const err = error instanceof Error ? error : new Error(String(error));
  const service = context.service || 'akubrecah-app';
  const message = err.message || 'Unknown application error';

  // 1. Pino Structured Server Logging
  logger.error(
    {
      err: {
        message: err.message,
        name: err.name,
        stack: err.stack,
      },
      ...context,
    },
    `[Error caught in ${service}]: ${message}`
  );

  // 2. Sentry Centralized Reporting (if DSN configured)
  let sentryEventId = '';
  if (isSentryConfigured) {
    try {
      Sentry.withScope((scope) => {
        if (context.tags) {
          scope.setTags(context.tags);
        }
        if (context.extra) {
          scope.setExtras(context.extra);
        }
        if (context.user) {
          // SECURITY: never send user email to the third-party Sentry service
          // (KDPA zero-PII). Only a pseudonymous id is shared.
          scope.setUser({
            id: context.user.id,
          });
        }
        if (context.service) {
          scope.setTag('service', context.service);
        }
        if (context.action) {
          scope.setTag('action', context.action);
        }
        sentryEventId = Sentry.captureException(err);
      });
    } catch (sentryErr: any) {
      logger.warn({ sentryErr: sentryErr.message }, 'Failed to dispatch error to Sentry');
    }
  }

  // 3. Database SystemLog Audit Persistence (non-blocking)
  try {
    await createSystemLog({
      level: 'error',
      service,
      message,
      actor: context.actor || context.user?.email || 'System',
      ip: context.ip || '127.0.0.1',
      details: {
        errorName: err.name,
        stack: err.stack?.split('\n').slice(0, 5).join('\n'),
        sentryEventId: sentryEventId || undefined,
        path: context.path,
        method: context.method,
        extra: context.extra,
      },
    });
  } catch {
    // Audit failure should never crash request handling
  }

  return sentryEventId;
}

/**
 * Add a diagnostic breadcrumb to trace execution leading up to a failure
 */
export function recordBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}) {
  if (isSentryConfigured) {
    try {
      Sentry.addBreadcrumb({
        category: breadcrumb.category,
        message: breadcrumb.message,
        level: breadcrumb.level || 'info',
        data: breadcrumb.data,
      });
    } catch {
      // Ignore
    }
  }
}

/**
 * Set the currently active user context for error tracking
 */
export function setUserScope(user: { id?: string; email?: string; role?: string } | null) {
  if (isSentryConfigured) {
    try {
      if (user) {
        // SECURITY: email must not leave the app boundary to third-party trackers.
        Sentry.setUser({ id: user.id, role: user.role });
      } else {
        Sentry.setUser(null);
      }
    } catch {
      // Ignore
    }
  }
}
