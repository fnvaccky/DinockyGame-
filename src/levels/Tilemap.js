/** Load a rectangular character map into the collision shapes used by Physics. */
export class Tilemap {
  constructor({ rows, tileSize = 40, legend = {} }) {
    if (!Array.isArray(rows) || !rows.length || !rows[0].length ||
        !rows.every(row => typeof row === 'string' && row.length === rows[0].length)) {
      throw new Error('Tilemap requires nonempty rows of equal width.');
    }
    if (!Number.isFinite(tileSize) || tileSize <= 0) throw new Error('Invalid tile size.');
    this.width = rows[0].length * tileSize;
    this.height = rows.length * tileSize;
    this.obstacles = [];
    this.oneWayPlatforms = [];
    this.hazards = [];
    const tiles = {
      '#': { type: 'ground', isPhaseable: false },
      'X': { type: 'block', isPhaseable: false },
      'B': { type: 'barrier', isPhaseable: true },
      '=': { type: 'platform' },
      '^': { type: 'spikes' },
      ...legend
    };
    const runs = new Map();
    rows.forEach((row, r) => {
      // Merge horizontal runs so collision and rendering stay inexpensive.
      for (let c = 0; c < row.length;) {
        const symbol = row[c];
        let end = c + 1;
        while (row[end] === symbol) end++;
        const tile = tiles[symbol];
        if (tile) {
          const shape = { ...tile, x: c * tileSize, y: r * tileSize,
            w: (end - c) * tileSize, h: tileSize };
          if (tile.type === 'platform') {
            shape.h = 14;
            this.oneWayPlatforms.push(shape);
          } else if (tile.type === 'spikes') {
            shape.y += tileSize - 16;
            shape.h = 16;
            this.hazards.push(shape);
          } else {
            const key = `${symbol}:${c}:${end}`;
            const previous = runs.get(key);
            if (previous && previous.y + previous.h === shape.y) previous.h += shape.h;
            else {
              this.obstacles.push(shape);
              runs.set(key, shape);
            }
          }
        }
        c = end;
      }
    });
  }
}
