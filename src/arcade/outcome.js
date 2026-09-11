/* L'esito di un rigore, senza DOM e senza canvas: così si può simulare
   migliaia di volte e verificare che il portiere sia difficile ma corretto. */

export const OUT = 'out';
export const POST = 'post';
export const SAVE = 'save';
export const GOAL = 'goal';

const POST_BAND = 14;

/**
 * @param {{x:number,y:number}} pos   dove arriva la palla sulla linea di porta
 * @param {{left,right,top,bottom}} goal
 * @param {{hands:Array<{x,y}>, body:{x,y}, radius:number}} keeper
 */
export function resolveOutcome(pos, goal, keeper) {
  if (pos.y < goal.top - POST_BAND
      || pos.x < goal.left - POST_BAND
      || pos.x > goal.right + POST_BAND
      || pos.y > goal.bottom + POST_BAND) {
    return OUT;
  }
  if (Math.abs(pos.x - goal.left) < POST_BAND
      || Math.abs(pos.x - goal.right) < POST_BAND
      || Math.abs(pos.y - goal.top) < POST_BAND) {
    return POST;
  }
  if (keeper.radius <= 0) return GOAL;

  const reached = keeper.hands.some(
    (h) => Math.hypot(h.x - pos.x, h.y - pos.y) < keeper.radius,
  ) || Math.hypot(keeper.body.x - pos.x, keeper.body.y - pos.y) < keeper.radius * 0.72;

  return reached ? SAVE : GOAL;
}
