import commentJson from "comment-json";
const { parse, stringify } = commentJson;
/**
 * Parse JSON or JSONC content preserving comments via comment-json.
 *
 * `comment-json` accepts trailing commas natively, so the content is handed to
 * it verbatim. An earlier hand-rolled pre-pass stripped trailing commas first;
 * it tracked `"` and `'` as string delimiters without understanding comments, so
 * a single unpaired quote inside a `//` or block comment inverted its
 * in-string state for the rest of the file and it then edited real string
 * values and comment text. Since `parse` never needed the help, the pre-pass
 * could only ever do harm.
 */
export function parseJsonOrJsonc(content, isJsonc) {
    return parse(content);
}
/**
 * Stringify data back to JSONC while preserving attached comments.
 */
export function stringifyWithComments(data) {
    return stringify(data, null, 2);
}
//# sourceMappingURL=jsonc.js.map