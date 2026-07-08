import type { RunRepository } from '@/application/ports/RunRepository';

export const listRunsUseCase = (repo: RunRepository) => repo.list();
