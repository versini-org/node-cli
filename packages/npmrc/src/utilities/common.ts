import kleur from "kleur";

export const GET_REGISTRY_CMD =
	'npm config list -l -g -json | grep registry\\"';

export const formatRegistries = (registries: string) => {
	/**
	 * We receive this kind of output: [
	 *   '  "@node-cli:registry": "https://other-registry.npmjs.org/"',
	 *   '  "registry": "https://registry.npmjs.org/"',
	 * ] And we need convert that to a JSON object that looks like that: [
	 *   { "@node-cli:registry": "https://other-registry.npmjs.org/" },
	 *   { "registry": "https://registry.npmjs.org/" },
	 * ].
	 */
	const messages = [];
	const stdoutLines = registries.split("\n");
	const jsonObjects = stdoutLines
		.map((line) => {
			const trimmedLine = line.trim();
			if (trimmedLine.startsWith('"') && trimmedLine.endsWith(",")) {
				const jsonLine = trimmedLine.slice(0, -1); // remove trailing comma
				try {
					const jsonObject = JSON.parse(`{${jsonLine}}`);
					return jsonObject;
					/* v8 ignore start */
				} catch {
					// nothing to declare officer.
				}
			}
			// eslint-disable-next-line unicorn/no-null
			return null;
			/* v8 ignore stop */
		})
		.filter(Boolean); // remove undefined values

	for (const jsonObject of jsonObjects) {
		messages.push(
			` • ${Object.keys(jsonObject)}:`,
			`    ${kleur.underline().grey(`${Object.values(jsonObject)}`)}`,
		);
	}
	return messages;
};
