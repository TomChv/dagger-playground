export function drain(queue, limit) {
  const taken = [];
  while (queue.length > 0 && taken.length < limit) {
    taken.push(queue.shift());
  }
  return taken;
}
