import { Level1 } from './Level1.js';
import { Level2 } from './Level2.js';
import { Level3 } from './Level3.js';

export const LEVELS = [
  {
    id: '1-1',
    name: 'Snack Meadow',
    number: '1–1',
    description: 'A sunny meadow of grassy biscuit islands and sweet treats',
    themeColor: '#527540',
    create: () => new Level1()
  },
  {
    id: '1-2',
    name: 'Sugarberry Grove',
    number: '1–2',
    description: 'Sweet berry treetops and springy jelly bounce pads',
    themeColor: '#BE185D',
    create: () => new Level2()
  },
  {
    id: '1-3',
    name: 'Cookie Crumble Cove',
    number: '1–3',
    description: 'Golden hour cookie cliffs, wafer bridges & Grand Finale',
    themeColor: '#D97706',
    create: () => new Level3()
  }
];

export function createLevel(id = '1-1') {
  const match = LEVELS.find(l => l.id === id);
  return match ? match.create() : new Level1();
}

