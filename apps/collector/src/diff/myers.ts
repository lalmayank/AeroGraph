/**
 * Deterministic Myers sequence diff over string arrays.
 *
 * Returns the edit script as a list of operations.
 * Output is deterministic: given the same inputs, the same edit script is
 * produced regardless of iteration order.
 *
 * Reference: "An O(ND) Difference Algorithm and Its Variations" — Eugene W. Myers
 * This is a simplified forward-only Myers diff that produces the shortest edit script.
 */
export type DiffOp =
  | { op: "equal"; aIndex: number; bIndex: number }
  | { op: "delete"; aIndex: number }
  | { op: "insert"; bIndex: number };

export function myersDiff(a: readonly string[], b: readonly string[]): DiffOp[] {
  const N = a.length;
  const M = b.length;

  if (N === 0 && M === 0) return [];
  if (N === 0) return b.map((_, bIndex) => ({ op: "insert" as const, bIndex }));
  if (M === 0) return a.map((_, aIndex) => ({ op: "delete" as const, aIndex }));

  const max = N + M;
  // v[k] = furthest reaching x-position on diagonal k
  const v: number[] = new Array(2 * max + 1).fill(0);
  // trace stores each step's v array for backtracking
  const trace: number[][] = [];

  let found = false;
  let finalD = 0;

  outer: for (let d = 0; d <= max; d++) {
    const vSnap = v.slice();
    trace.push(vSnap);

    for (let k = -d; k <= d; k += 2) {
      const ki = k + max; // offset to avoid negative indices

      let x: number;
      if (k === -d || (k !== d && v[ki - 1] < v[ki + 1])) {
        // move down: come from k+1
        x = v[ki + 1];
      } else {
        // move right: come from k-1
        x = v[ki - 1] + 1;
      }

      let y = x - k;

      // Extend snake (diagonal moves where a[x] === b[y])
      while (x < N && y < M && a[x] === b[y]) {
        x++;
        y++;
      }

      v[ki] = x;

      if (x >= N && y >= M) {
        found = true;
        finalD = d;
        break outer;
      }
    }
  }

  if (!found) {
    // Fallback: replace everything (should not happen for valid inputs)
    const ops: DiffOp[] = [];
    for (let i = 0; i < N; i++) ops.push({ op: "delete", aIndex: i });
    for (let j = 0; j < M; j++) ops.push({ op: "insert", bIndex: j });
    return ops;
  }

  // Backtrack from trace to reconstruct the edit path
  const path: Array<{ x: number; y: number }> = [];
  let x = N;
  let y = M;

  for (let d = finalD; d > 0; d--) {
    const vPrev = trace[d - 1];
    const k = x - y;
    const ki = k + max;

    let prevK: number;
    if (k === -d || (k !== d && vPrev[ki - 1] < vPrev[ki + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = vPrev[prevK + max];
    const prevY = prevX - prevK;

    // Add diagonal (snake) moves first
    while (x > prevX + (prevK === k - 1 ? 1 : 0) + (x - y !== prevX - prevY ? 1 : 0)) {
      // Snake segment
      if (x > prevX && y > prevY && x - prevX === y - prevY) {
        x--;
        y--;
        path.push({ x, y });
      } else {
        break;
      }
    }

    // Add the edit move
    path.push({ x: prevX, y: prevY });
    x = prevX;
    y = prevY;
  }

  // Add remaining snake from (x,y) to (0,0)
  while (x > 0 && y > 0 && a[x - 1] === b[y - 1]) {
    x--;
    y--;
    path.push({ x, y });
  }

  path.reverse();

  // Convert path to operations
  const ops: DiffOp[] = [];
  let ax = 0;
  let bx = 0;

  for (const { x: px, y: py } of path) {
    while (ax < px && bx < py && a[ax] === b[bx]) {
      ops.push({ op: "equal", aIndex: ax, bIndex: bx });
      ax++;
      bx++;
    }
    if (ax < px) {
      ops.push({ op: "delete", aIndex: ax });
      ax++;
    } else if (bx < py) {
      ops.push({ op: "insert", bIndex: bx });
      bx++;
    }
  }

  // Remaining diagonal
  while (ax < N && bx < M && a[ax] === b[bx]) {
    ops.push({ op: "equal", aIndex: ax, bIndex: bx });
    ax++;
    bx++;
  }
  while (ax < N) {
    ops.push({ op: "delete", aIndex: ax });
    ax++;
  }
  while (bx < M) {
    ops.push({ op: "insert", bIndex: bx });
    bx++;
  }

  return ops;
}
