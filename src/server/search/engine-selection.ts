import {
  getActiveWebEngines,
  getEnginesForCustomType,
} from "../extensions/engines/registry";
import type { EngineConfig, SearchEngine } from "../types";

export interface ActiveEngine {
  id: string;
  instance: SearchEngine;
  score: number;
}

export const selectActiveEngines = async (
  type: string,
  config: EngineConfig,
): Promise<ActiveEngine[]> => {
  if (type === "web") return getActiveWebEngines(config);
  return (await getEnginesForCustomType(type, config)).map((e) => ({
    id: e.id,
    instance: e.instance,
    score: 1,
  }));
};
