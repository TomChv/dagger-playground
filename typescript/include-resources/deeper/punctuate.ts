// Two hops out from the module: app/src/index.ts imports ../../shared/greet.js,
// which imports this. The `!!` in a greeting is how you can tell it arrived.

export function punctuate(text: string): string {
  return `${text}!!`
}
