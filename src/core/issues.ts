export type IssueCode =
    | 'required'
    | 'pattern'
    | 'minLength'
    | 'maxLength'
    | 'enum'
    | 'type'
    | 'cardinality'
    | 'illegalChar'
    | 'unknownElement';

/** A single validation problem, addressed by a path into the *input* object. */
export interface Issue {
    /** e.g. `tracks[0].isrc` — the shape the caller wrote, not the XML shape. */
    readonly path: string;
    readonly code: IssueCode;
    readonly message: string;
}

/** Thrown by `buildRelease` and `parseRelease`; carries every issue, not just the first. */
export class AudioSaladValidationError extends Error {
    readonly issues: readonly Issue[];

    constructor(issues: readonly Issue[]) {
        const head = issues
            .slice(0, 5)
            .map((i) => `  ${i.path}: ${i.message}`)
            .join('\n');
        const more = issues.length > 5 ? `\n  …and ${issues.length - 5} more` : '';
        super(`AudioSalad XML validation failed with ${issues.length} issue(s):\n${head}${more}`);
        this.name = 'AudioSaladValidationError';
        this.issues = issues;
    }
}

export const issue = (path: string, code: IssueCode, message: string): Issue => ({
    path,
    code,
    message,
});
