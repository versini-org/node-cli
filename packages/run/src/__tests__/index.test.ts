import { run } from "../run";
import { parseCommandString } from "../utilities";

describe("when testing for run utilities with no logging side-effects", () => {
	it("should return the command output via stdout", async () => {
		const { stdout, stderr } = await run("echo hello world");
		expect(stdout).toBe("hello world");
		expect(stderr).toBe("");
	});

	it("should run 2 commands one after the other", async () => {
		const { stdout, stderr } = await run("echo hello && echo world");
		expect(stdout).toBe("hello\nworld");
		expect(stderr).toBe("");
	});

	it("should throw an error if the command fails", async () => {
		await expect(run("not-a-command")).rejects.toBeTruthy();
		await expect(run("")).rejects.toBeTruthy();
		// @ts-expect-error
		await expect(run(666)).rejects.toBeTruthy();
	});

	it("should not throw an error, even if the command does not exist", async () => {
		expect.assertions(1);
		const result = await run("not-a-command", {
			ignoreError: true,
		});
		expect(result).toStrictEqual({
			stderr: 1,
			exitCode: 1,
			shortMessage:
				"Command failed with ENOENT: not-a-command\nspawn not-a-command ENOENT",
		});
	});

	it("should not throw an error even if the command fails", async () => {
		const result = await run("ls /no-existing-folder", {
			ignoreError: true,
		});
		expect(result.exitCode).toBeGreaterThan(0);
		expect(result.shortMessage).toBe(
			`Command failed with exit code ${result.exitCode}: ls /no-existing-folder`,
		);
	});

	it("should be able to run a command with a pipe", async () => {
		const { stdout, stderr } = await run("echo hello | wc -l");
		const lines = typeof stdout === "string" ? stdout.trim() : stdout;
		expect(lines).toBe("1");
		expect(stderr).toBe("");
	});

	it("should be able to run a command with single quote", async () => {
		const { stdout, stderr } = await run("echo 'hello world'");
		expect(stdout).toBe("'hello world'");
		expect(stderr).toBe("");
	});

	it("should be able to run a command with double quote", async () => {
		const { stdout, stderr } = await run('echo "hello world"');
		expect(stdout).toBe('"hello world"');
		expect(stderr).toBe("");
	});
});

describe("parseCommandString", () => {
	it("should return an empty array for an empty command", () => {
		expect(parseCommandString("")).toEqual([]);
	});

	it("should handle commands with only spaces", () => {
		expect(parseCommandString("   ")).toEqual([]);
	});

	it("should split normal commands by spaces", () => {
		expect(parseCommandString("echo hello world")).toEqual([
			"echo",
			"hello",
			"world",
		]);
	});

	it("should not split on escaped spaces", () => {
		expect(parseCommandString("echo hello\\ world")).toEqual([
			"echo",
			"hello world",
		]);
	});

	it("should handle multiple escaped spaces", () => {
		expect(parseCommandString("path\\ to\\ some\\ file")).toEqual([
			"path to some file",
		]);
	});

	it("should handle mixed escaped and unescaped spaces", () => {
		expect(parseCommandString("echo this\\ is\\ a test")).toEqual([
			"echo",
			"this is a",
			"test",
		]);
	});
});
