import { ControlApiClient } from '@/infrastructure/http/controlApiClient';
import { ControlAppRepository } from '@/infrastructure/repositories/ControlAppRepository';
import { ControlRunRepository } from '@/infrastructure/repositories/ControlRunRepository';
import { ControlSystemRepository } from '@/infrastructure/repositories/ControlSystemRepository';

const client = new ControlApiClient();

export const dependencies = {
  appRepository: new ControlAppRepository(client),
  runRepository: new ControlRunRepository(client),
  systemRepository: new ControlSystemRepository(client),
};
