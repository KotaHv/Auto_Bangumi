import { create } from 'zustand';
import { apiProgram } from '@/api/program';
import { apiBangumi } from '@/api/bangumi';
import { executeApi } from '@/hooks/use-api';

export const useProgramStore = create(() => ({
  start: () => executeApi(apiProgram.start),
  pause: () => executeApi(apiProgram.stop),
  shutdown: () => executeApi(apiProgram.shutdown),
  restart: () => executeApi(apiProgram.restart),
  resetRule: () => executeApi(apiBangumi.resetAll),
}));
