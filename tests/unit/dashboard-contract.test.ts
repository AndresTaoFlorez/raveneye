import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboardSrc = join(process.cwd(), 'apps', 'dashboard', 'src');

describe('dashboard noVNC contract', () => {
  it('does not fabricate app-specific noVNC URLs in presentation code', async () => {
    const files = [
      'presentation/views/OverviewView.tsx',
      'presentation/views/ObservedAppsView.tsx',
      'presentation/components/apps/AppsList.tsx',
      'infrastructure/repositories/ControlAppRepository.ts',
    ];
    const contents = await Promise.all(files.map((file) => readFile(join(dashboardSrc, file), 'utf8')));
    const joined = contents.join('\n');

    expect(joined).not.toContain('noVncUrlForApp');
    expect(joined).not.toContain('app=');
    expect(joined).not.toContain('127.0.0.1:6080');
    expect(joined).toContain('watchUrl');
  });
});
