import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { FEATURE_FLAGS } from '@/lib/feature-flags/flags';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Missing flag key parameter' }, { status: 400 });
  }

  // SECURITY / hygiene: only registry-defined flags are queryable. Arbitrary
  // keys bypass the flag cache and turn this endpoint into a Postgres
  // existence oracle over service_settings keys.
  if (!Object.prototype.hasOwnProperty.call(FEATURE_FLAGS, key)) {
    return NextResponse.json({ error: 'Unknown flag key' }, { status: 404 });
  }

  const isEnabled = await isFeatureEnabled(key);

  return NextResponse.json(
    { key, isEnabled },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}
