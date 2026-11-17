import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getPublicGithubRepos } from '@/lib/github';

export const dynamic = 'force-dynamic';

const ALLOWED_GITHUB_OWNERS = new Set(['akubrecah', 'aku-brecah']);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedUser = (searchParams.get('user') || 'Akubrecah').trim();
    const username = ALLOWED_GITHUB_OWNERS.has(requestedUser.toLowerCase()) ? 'Akubrecah' : 'Akubrecah';
    const language = searchParams.get('language') || 'all';
    const search = (searchParams.get('q') || '').toLowerCase().trim();
    const sort = searchParams.get('sort') || 'updated'; // 'updated' | 'stars' | 'forks' | 'name'

    const { repos, stats } = await getPublicGithubRepos(username);

    let filtered = repos;

    if (language !== 'all') {
      filtered = filtered.filter(
        (r) => r.language.toLowerCase() === language.toLowerCase()
      );
    }

    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.description.toLowerCase().includes(search) ||
          r.topics.some((t) => t.toLowerCase().includes(search))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sort === 'stars') return b.stars - a.stars;
      if (sort === 'forks') return b.forks - a.forks;
      if (sort === 'name') return a.name.localeCompare(b.name);
      return new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime();
    });

    return NextResponse.json({
      success: true,
      username,
      totalCount: repos.length,
      filteredCount: filtered.length,
      stats,
      repos: filtered,
    });
  } catch (error: any) {
    log.error('[API /api/github/repos Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load GitHub repositories' },
      { status: 500 }
    );
  }
}
