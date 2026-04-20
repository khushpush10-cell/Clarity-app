import * as Sentry from '@sentry/browser';
import posthog from 'posthog-js';

let initialized = false;

export function initObservability() {
	if (initialized) return;
	initialized = true;

	const sentryDsn = import.meta.env.PUBLIC_SENTRY_DSN;
	const posthogKey = import.meta.env.PUBLIC_POSTHOG_KEY;
	const posthogHost = import.meta.env.PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

	if (sentryDsn) {
		Sentry.init({
			dsn: sentryDsn,
			tracesSampleRate: 0.1
		});
	}

	if (posthogKey) {
		posthog.init(posthogKey, {
			api_host: posthogHost,
			capture_pageview: true
		});
	}
}
