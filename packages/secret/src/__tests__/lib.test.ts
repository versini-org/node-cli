import {
	createHash,
	createSalt,
	decrypt,
	encrypt,
	hashPassword,
	verifyPassword,
} from "../lib";

const password = "this is a skrt";
const contentToEncrypt = "Hello World";
const contentToEncryptUTF8 = "⭐️ Hello World ⭐️";

describe("when testing for individual utilities with no logging side-effects", () => {
	it("should create an hexadecimal hash from a given string with md5 as a default.", async () => {
		const result = createHash(password);
		expect(result).toEqual("0f2258436205eec8e11e1bb8d9a967c4");
	});

	it("should create an hexadecimal hash from a given string with sha256.", async () => {
		const result = createHash(password, "sha256");
		expect(result).toEqual(
			"c19952f971ab236afcb825e387e64c2194cf8cfbb814f0ac0cd85702a9d15696",
		);
	});

	it("should encrypt and decrypt a simple string", async () => {
		const encrypted = encrypt(password, contentToEncrypt);
		const decrypted = decrypt(password, encrypted);
		expect(decrypted).toBe(contentToEncrypt);
	});

	it("should encrypt and decrypt a UTF8 string", async () => {
		const encrypted = encrypt(password, contentToEncryptUTF8);
		const decrypted = decrypt(password, encrypted);
		expect(decrypted).toBe(contentToEncryptUTF8);
	});

	it("should generate a random salt with the specified number of bytes", () => {
		const bytes = 32;
		const salt = createSalt(bytes);
		expect(salt.length).toBe(bytes * 2); // Each byte is represented by 2 characters in hexadecimal format
	});

	it("should generate a random salt with the default number of bytes if not specified", () => {
		const salt = createSalt();
		expect(salt.length).toBe(256 * 2); // Each byte is represented by 2 characters in hexadecimal format
	});
});

describe("when testing the verifyPassword method", () => {
	const password = "Hello World";
	const correctHash =
		"f535ccb9864bc3132cda:59feca49a7e394c4bc0efab7744e5c1b8b58e921e8aeaa285e5c083d99dbe5f667a4fecb21b4904afe6ce204d5589707d02adbe8dc1c06a681924039f52667cd";
	const incorrectHash =
		"f535ccb9864bc3132cda:59feca49a7e394c4bc0efab7744e5c1b8b58e921e8aeaa285e5c083d99dbe5f667a4fecb21b4904afe6ce204d5589707d02adbe8dc1c06a681924039f52667ce";

	it("should return true when the password matches the hash", () => {
		const result = verifyPassword(password, correctHash);
		expect(result).toBe(true);
	});

	it("should return false when the password does not match the hash", () => {
		const result = verifyPassword(password, incorrectHash);
		expect(result).toBe(false);
	});

	it("should return false when derived keys have different length", () => {
		const result = verifyPassword(password, incorrectHash + "123456");
		expect(result).toBe(false);
	});
});

describe("when testing the hashPassword method", () => {
	const password = "Hello World";
	const salt = "f535ccb9864bc3132cda";
	const expectedHash =
		"f535ccb9864bc3132cda:59feca49a7e394c4bc0efab7744e5c1b8b58e921e8aeaa285e5c083d99dbe5f667a4fecb21b4904afe6ce204d5589707d02adbe8dc1c06a681924039f52667cd";

	it("should generate a hash for the given password and salt", () => {
		const result = hashPassword(password, salt);
		expect(result).toBe(expectedHash);
	});

	it("should generate a hash with a random salt if salt is not provided", () => {
		const result = hashPassword(password);
		const [generatedSalt, _] = result.split(":");
		expect(generatedSalt).not.toBe(salt);
	});
});
