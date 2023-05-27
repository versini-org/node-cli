import { run } from "../run";

describe("when testing for run utilities with no logging side-effects", () => {
	it("should return the command output via stdout", async () => {
		const { stdout, stderr } = await run("echo hello");
		expect(stdout).toBe("hello");
		expect(stderr).toBe("");
	});

	it("should run 2 commands one after the other", async () => {
		const { stdout, stderr } = await run("echo hello && echo world");
		expect(stdout).toBe("hello\nworld");
		expect(stderr).toBe("");
	});

	it("should throw an error if the command fails", async () => {
		await expect(run("not-a-command")).rejects.toBeTruthy();
	});

	it("should not throw an error even if the command does not exist", async () => {
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
		expect.assertions(2);
		const result = await run("ls /no-existing-folder", {
			ignoreError: true,
		});
		expect(result.exitCode).toBeGreaterThan(0);
		expect(result.shortMessage).toBe(
			`Command failed with exit code ${result.exitCode}: ls /no-existing-folder`
		);
	});
});
