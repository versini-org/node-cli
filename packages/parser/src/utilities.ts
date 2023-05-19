/* eslint-disable unicorn/no-process-exit */

import { Logger } from "@node-cli/logger";
import Table from "cli-table3";
import _ from "lodash";
import kleur from "kleur";
import path from "node:path";
export const logger = new Logger();

kleur.enabled = false;

/**
 * Converts the first character of string to upper case
 * @param {string} string_ the string to convert
 * @returns {string} the converted string
 */
const upperFirst = (string_: string): string =>
	string_[0].toUpperCase() + string_.slice(1);

/**
 * Wrapper method for lodash `merge()` and `mergeWith()` methods.
 *
 * Without the `customizer` function, this method recursively merges own and inherited
 * enumerable string keyed properties of source objects into the destination object.
 * Source properties that resolve to undefined are skipped if a destination value exists.
 * Array and plain object properties are merged recursively. Other objects and value
 * types are overridden by assignment. Source objects are applied from left to right.
 * Subsequent sources overwrite property assignments of previous sources.
 *
 * With the `customizer` function, the behavior is the same except that `customizer` is
 * invoked to produce the merged values of the destination and source properties.
 * If customizer returns undefined, merging is handled by the `shallowMerge` instead.
 * The customizer is invoked with six arguments: `(objValue, srcValue, key, object,
 * source, stack)`
 * @param {object} objectA
 * @param {object} objectB
 * @param {function} customizer
 * @returns {object} !! WARNING: this method will mutate objectA
 */
export const shallowMerge = (
	objectA: any,
	objectB: any,
	customizer?: any
): object => {
	return typeof customizer === "function"
		? _.mergeWith(objectA, objectB, customizer)
		: _.merge(objectA, objectB);
};

export const meowOptionsHelper = (parameters_: {
	flags?: any;
	parameters?: any;
	usage?: any;
	examples?: any;
}) => {
	let { usage, flags, parameters, examples } = parameters_;
	let helpText = "",
		usageText = "";
	const commandPrefix = "> ";
	const options: any = {
		allowUnknownFlags: false,
		autoHelp: false,
		autoVersion: false,
		description: false,
		flags,
	};
	const commonTableConfiguration = {
		chars: {
			bottom: "",
			"bottom-left": "",
			"bottom-mid": "",
			"bottom-right": "",
			left: "",
			"left-mid": "",
			mid: "",
			"mid-mid": "",
			middle: "",
			right: "",
			"right-mid": "",
			top: "",
			"top-left": "",
			"top-mid": "",
			"top-right": "",
		},
		style: {
			"padding-left": 0,
			"padding-right": 2,
		},
		wordWrap: true,
	};

	if (usage) {
		if (typeof usage === "string") {
			const optionalParameters = usage.match(/\[(.*?)]/g);
			const requiredParameters = usage.match(/<(.*?)>/g);
			if (optionalParameters) {
				for (const item of optionalParameters) {
					usage = usage.replace(item, `${kleur.green(item)}`);
				}
			}
			if (requiredParameters) {
				for (const item of requiredParameters) {
					usage = usage.replace(item, `${kleur.red(item)}`);
				}
			}
			usageText = `  Usage:\n    ${commandPrefix}${usage}`;
		}
		if (typeof usage === "boolean") {
			const processName = path.basename(process.argv[1]);
			usageText = ` Usage:\n    ${commandPrefix}${processName}`;
			if (flags) {
				usageText += kleur.green(" [options]");
			}
		}
	}

	if (flags) {
		const flagsTable = new Table(commonTableConfiguration);
		helpText += "\n\n  Options:\n";

		for (const item of Object.keys(flags).sort()) {
			const flag = flags[item];
			const aliasCell = flag.shortFlag
				? `    ${kleur.blue(`-${flag.shortFlag}, --${item}`)}`
				: `    ${kleur.blue(`    --${item}`)}`;
			const defaultCell =
				flag.default === undefined
					? ""
					: `${kleur.grey(`(default: ${flag.default})`)}`;
			flagsTable.push([aliasCell, flag.description, defaultCell]);
		}
		helpText += flagsTable.toString();
	}

	if (parameters) {
		const parametersTable = new Table(commonTableConfiguration);
		helpText += "\n\n";

		for (const item of Object.keys(parameters).sort()) {
			const parameter = parameters[item];
			const headerCell = `  ${upperFirst(item)}:`;
			const defaultCell =
				parameter.default === undefined
					? ""
					: `${kleur.grey(`(default: ${parameter.default})`)}`;
			parametersTable.push([headerCell, parameter.description, defaultCell]);
			if (typeof usage === "boolean") {
				usageText += ` ${kleur.green(`[${item}]`)}`;
			}
		}
		helpText += parametersTable.toString();
	}

	if (examples) {
		helpText += "\n\n  Examples:\n";
		for (const item of examples) {
			helpText += `\n    ${kleur.grey(`${item.comment}`)}\n`;
			helpText += `    ${kleur.blue(`${commandPrefix}${item.command}`)}\n`;
		}
	}

	return {
		helpText: `\n${usageText}${helpText}`,
		options,
	};
};

export const meowParserHelper = (parameters: {
	cli: any;
	restrictions?: any;
}) => {
	const { cli, restrictions } = parameters;
	try {
		if (cli.flags.help) {
			cli.showHelp();
			process.exit(0);
		}
	} catch {
		// nothing to declare officer
	}

	try {
		if (cli.flags.version) {
			cli.showVersion();
			process.exit(0);
		}
	} catch {
		// nothing to declare officer
	}

	if (restrictions && restrictions.length > 0) {
		for (const rule of restrictions) {
			if (rule.test(cli.flags)) {
				logger.error(rule.message(cli.flags));
				process.exit(rule.exit);
			}
		}
	}
};
