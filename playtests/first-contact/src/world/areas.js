/** World Navigation v0.1: a small, story-configured registry. */
export const AREAS = Object.freeze({
  mailbox: Object.freeze({
    id: 'mailbox', label: 'Mailbox Area', kind: 'area',
    exits: Object.freeze(['shed']),
    description: 'A raised flag. No return address.'
  }),
  shed: Object.freeze({
    id: 'shed', label: 'Old Shed Exterior', kind: 'area',
    exits: Object.freeze(['mailbox']),
    description: 'The door is old. The hinges are older.'
  })
});
export const AREA_IDS = Object.freeze(Object.keys(AREAS));
export function areaFor(id) { return Object.hasOwn(AREAS,id) ? AREAS[id] : null; }
