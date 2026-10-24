// Lives outside the module directory. The module reaches it because it imports
// it; nothing declares this directory anywhere.

// Nothing in app/ names ../deeper. It arrives because this file imports it, one
// hop further out — which is the part that only works if following is transitive.
import { punctuate } from "../deeper/punctuate.js"

/** Imported as a @func argument type, so the module's *scan* has to resolve this file. */
export type Name = string

export function greet(name: Name): string {
  return punctuate(`hello ${name} from ../shared`)
}
