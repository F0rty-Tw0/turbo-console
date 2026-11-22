import { isSupportedTurboVersion } from '../../utils/turbo-version.util.ts';
import { OPT_OUT_TURBO_RANGE } from '../common/turbo-opt-out.const.ts';

/** True when turbo `version` opts out the tasks its exclusion walk reaches; false on 2.11.7–2.11.10. */
export const optsOutExcludedTasks = (version: string): boolean => isSupportedTurboVersion(version, OPT_OUT_TURBO_RANGE);
