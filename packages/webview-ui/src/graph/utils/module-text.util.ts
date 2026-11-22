/** The scan line of Waiting and Loading (spec §7.2). */
export const scanningTextOf = (name: string): string => `Scanning ${name}…`;

/** The notice shown when a graph state no longer lists the package modules mode shows (spec §7.2). */
export const moduleGoneTextOf = (name: string): string => `${name} is no longer in the workspace`;
