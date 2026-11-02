export const CATALOG = Object.freeze([
  { id: 'pink', name: 'Strawberry', kind: 'color', price: 0, color: '#F48B96', dark: '#DE6875', light: '#FFA8B1', description: 'The original snack-loving sweetheart.' },
  { id: 'mint', name: 'Mint Chip', kind: 'color', price: 75, color: '#8FCDA8', dark: '#58A77E', light: '#B8E8C7', description: 'Fresh from the meadow.' },
  { id: 'lavender', name: 'Berry Dream', kind: 'color', price: 75, color: '#B79AE0', dark: '#8E70BD', light: '#D3BBF3', description: 'A little sprinkle of daydream.' },
  { id: 'sky', name: 'Blueberry Sky', kind: 'color', price: 100, color: '#87C7E1', dark: '#4C9FC4', light: '#B4E6F4', description: 'Cloud nine, here we come.' },
  { id: 'cap', name: 'Explorer Cap', kind: 'accessory', price: 150, color: '#E8BC70', description: 'For very important snack expeditions.' },
  { id: 'scarf', name: 'Cozy Red Scarf', kind: 'accessory', price: 150, color: '#C62828', description: 'A warm red knit with tails that wave hello.' },
  { id: 'bee_hat', name: 'Bumble Bucket', kind: 'accessory', price: 200, color: '#F4B400', description: 'Buzzy stripes and two tiny wings. Bzz!' },
  { id: 'frog_hat', name: 'Froggy Bucket', kind: 'accessory', price: 200, color: '#7CC24A', description: 'Two big froggy eyes keep watch for snacks.' },
  { id: 'glasses', name: 'Rosy Specs', kind: 'accessory', price: 125, color: '#E8A0A8', description: 'Round rose-gold specs for spotting treats.' }
]);
export const HATS = Object.freeze(['cap', 'bee_hat', 'frog_hat']);
export function palette(id = 'pink') { return CATALOG.find(item => item.id === id && item.kind === 'color') || CATALOG[0]; }
export function normalizeCosmetics(value = {}) {
  return { color: palette(value.color).id, accessory: CATALOG.some(item => item.kind === 'accessory' && item.id === value.accessory) ? value.accessory : null };
}
