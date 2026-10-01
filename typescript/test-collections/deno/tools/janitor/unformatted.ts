// Valid, lint-clean and type-clean, but not `deno fmt`-formatted: single
// quotes, no semicolons, 4-space indent. `deno fmt --check` fails here and the
// `format` generator rewrites exactly this file. Never run `deno fmt` in this
// project.
export function label( id : string, attempts : number ) : string {
    if(attempts === 0){
        return `${id}: untouched`
    }
    return id + ' -> ' + attempts + ' attempts'
}
