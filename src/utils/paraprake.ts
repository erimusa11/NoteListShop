/** What a preliminary list is called on screen. */
export const PARAPRAKE_LABEL = 'Paraprake';

/** Anything that can be a list of the lists page (a trip, or a smaller entry made from one). */
interface MaybeParaprake {
  paraprake?: boolean;
}

// Only an explicit `true` counts, so a damaged or older copy of the data never makes a list paraprake by accident.
export const isParaprake = (list: MaybeParaprake): boolean => list.paraprake === true;

/**
 * The lists the way they are shown: the paraprake ones always on top, then the normal ones. Each group keeps the order the
 * lists were given in (newest first when they were given that way).
 */
export function pinParaprake<T extends MaybeParaprake>(lists: T[]): T[] {
  return [...lists.filter(isParaprake), ...lists.filter((list) => !isParaprake(list))];
}
