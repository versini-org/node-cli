const SPACES_REGEXP = / +/g;

export const parseCommandString = (command: string) => {
	const trimmedCommand = command.trim();
	if (trimmedCommand === "") {
		return [];
	}
	const tokens = [];
	for (const token of trimmedCommand.split(SPACES_REGEXP)) {
		// Allow spaces to be escaped by a backslash if not meant as a delimiter
		const previousToken = tokens.at(-1);
		/* v8 ignore next 4 */
		if (previousToken && previousToken.endsWith("\\")) {
			// Merge previous token with current one
			tokens[tokens.length - 1] = `${previousToken.slice(0, -1)} ${token}`;
		} else {
			tokens.push(token);
		}
	}
	return tokens;
};
