export const CATALOG = Object.freeze([
  { id: 'pink', name: 'Strawberry', kind: 'color', price: 0, color: '#F48B96', dark: '#DE6875', light: '#FFA8B1', description: 'The original snack-loving sweetheart.' },
  { id: 'mint', name: 'Mint Chip', kind: 'color', price: 75, color: '#8FCDA8', dark: '#58A77E', light: '#B8E8C7', description: 'Fresh from the meadow.' },
  { id: 'lavender', name: 'Berry Dream', kind: 'color', price: 75, color: '#B79AE0', dark: '#8E70BD', light: '#D3BBF3', description: 'A little sprinkle of daydream.' },
  { id: 'sky', name: 'Blueberry Sky', kind: 'color', price: 100, color: '#87C7E1', dark: '#4C9FC4', light: '#B4E6F4', description: 'Cloud nine, here we come.' },
  { id: 'cap', name: 'Explorer Cap', kind: 'accessory', price: 150, color: '#E8BC70', description: 'For very important snack expeditions.' },
  { id: 'scarf', name: 'Berry Scarf', kind: 'accessory', price: 150, color: '#BD4262', description: 'Cozy enough for one more adventure.' }
]);
export function palette(id = 'pink') { return CATALOG.find(item => item.id === id && item.kind === 'color') || CATALOG[0]; }
export function normalizeCosmetics(value = {}) {
  return { color: palette(value.color).id, accessory: ['cap', 'scarf'].includes(value.accessory) ? value.accessory : null };
}
