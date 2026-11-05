// The order the evidence grid draws its suspect rows in. Pure, and it reads only what the player can already see: an
// answer counts once it shows in the Camera row (`answered`, which trails the rules while gems fly) and a suspect's cell
// once it's scouted (`seen`). Hidden cells and pencil guesses never count, so the order gives nothing away.
import type { AnimalRound } from './animalBoard';

/** Best first: ruled-out or released animals last, then any with a contradiction, then more matches, then the card's number. */
export function suspectOrder(round: Pick<AnimalRound, 'suspects' | 'orders' | 'marked' | 'released'>, answered: readonly boolean[]): number[] {
  const ranked = round.suspects.map((id, number) => {
    const shown = round.orders.filter((order, j) => answered[j] && order.seen[number]);
    const matches = shown.filter(order => order.row[number] === (order.answer === 'yes')).length;
    return { id, number, matches, contradicted: matches < shown.length, out: round.marked.includes(id) || round.released.includes(id) };
  });
  return ranked
    .sort((a, b) => Number(a.out) - Number(b.out) || Number(a.contradicted) - Number(b.contradicted) || b.matches - a.matches || a.number - b.number)
    .map(row => row.id);
}
