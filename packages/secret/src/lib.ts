import crypto from "node:crypto";
import { Logger } from "@node-cli/logger";

export const logger = new Logger({
	boring: process.env.NODE_ENV === "test",
});

const HEX = "hex";
const UTF8 = "utf8";

const DEFAULT_CRYPTO_ALGO = "aes-256-ctr";
const DEFAULT_HASH_ALGO = "md5";
const DEFAULT_BYTES_FOR_IV = 16;
const DEFAULT_BYTES_FOR_SALT = 256;

/**
 * Create an hexadecimal hash from a given string. The default
 * algorithm is md5 but it can be changed to anything that
 * crypto.createHash allows.
 * @param  {String} string            the string to hash
 * @param  {String} [algorithm='md5'] the algorithm to use or hashing
 * @return {String}                   the hashed string in hexa format
 */
export const createHash = (
	string: string,
	algorithm: string = DEFAULT_HASH_ALGO,
): string => {
	return crypto.createHash(algorithm).update(string, UTF8).digest(HEX);
};

/**
 * Creates a random SALT value using the crypto library.
 * @param  {Number} [bytes=16] the number of bytes to generate
 * @return {String}            the generated salt in hexa format
 */
export const createSalt = (bytes?: number): string => {
	bytes = bytes || DEFAULT_BYTES_FOR_SALT;
	return crypto.randomBytes(bytes).toString(HEX);
};

/**
 * Encrypts a string or a buffer using AES-256-CTR
 * algorithm.
 * @param  {String} password a unique password
 * @param  {String} data     a string to encrypt
 * @return {String} the encrypted data in hexa
 *   encoding, followed by a dollar sign ($) and by a
 *   unique random initialization vector.
 */
export const encrypt = (password: string, data: string): string => {
	// Ensure that the initialization vector (IV) is random.
	const iv = crypto.randomBytes(DEFAULT_BYTES_FOR_IV);
	// Hash the given password (result is always the same).
	const key = createHash(password);
	// Create a cipher.
	const cipher = crypto.createCipheriv(DEFAULT_CRYPTO_ALGO, key, iv);
	// Encrypt the data using the newly created cipher.
	const encrypted = cipher.update(data, UTF8, HEX) + cipher.final(HEX);
	/*
	 * Append the IV at the end of the encrypted data
	 * to reuse it for decryption (IV is not a key,
	 * it can be public).
	 */
	return `${encrypted}$${iv.toString(HEX)}`;
};

/**
 * Decrypts a string that was encrypted using the
 * AES-256-CRT algorithm via `encrypt`. It expects
 * the encrypted string to have the corresponding
 * initialization vector appended at the end, after
 * a dollar sign ($) - which was done via the
 * corresponding `encrypt` method.
 * @param  {String} password a unique password
 * @param  {String} data     a string to decrypt
 * @return {String}          the decrypted data
 */
export const decrypt = (password: string, data: string): string => {
	// Extract encrypted data and initialization vector (IV).
	const [encrypted, ivHex] = data.split("$");
	// Create a buffer out of the raw hex IV
	const iv = Buffer.from(ivHex, HEX);
	// Hash the given password (result is always the same).
	const hash = createHash(password);
	// Create a cipher.
	const decipher = crypto.createDecipheriv(DEFAULT_CRYPTO_ALGO, hash, iv);
	// Return the decrypted data using the newly created cipher.
	return decipher.update(encrypted, HEX, UTF8) + decipher.final("utf8");
};
