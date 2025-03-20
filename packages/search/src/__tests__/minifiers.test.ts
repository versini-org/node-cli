import {
	minifyCss,
	minifyFileContent,
	minifyImports,
	minifyJs,
} from "../minifiers.js";

describe("when testing for minifiers utilities with no logging side-effects", () => {
	describe("minifyCss", () => {
		it("should remove CSS comments", () => {
			const input = `
      .class { /* This is a comment */ color: red; }
      /* This is another comment
         that spans multiple lines */
      #id { font-size: 12px; }
    `;
			const expected = ".class{color:red;}#id{font-size:12px;}";
			expect(minifyCss(input)).toContain(expected);
		});

		it("should remove extra whitespace", () => {
			const input = `
      .class {
        color: red;
        font-size: 12px;
      }
    `;
			const expected = ".class{color:red;font-size:12px;}";
			expect(minifyCss(input)).toContain(expected);
		});

		it("should handle multiple selectors with commas", () => {
			const input = `.class1, .class2, .class3 { color: blue; }`;
			const expected = ".class1,.class2,.class3{color:blue;}";
			expect(minifyCss(input)).toContain(expected);
		});

		it("should handle nested rules", () => {
			const input = `
      @media screen and (max-width: 600px) {
        .class {
          color: green;
        }
      }
    `;
			const expected =
				"@media screen and (max-width:600px){.class{color:green;}}";
			expect(minifyCss(input)).toContain(expected);
		});

		it("should handle complex CSS with multiple rules", () => {
			const input = `
      /* Header styles */
      header {
        background-color: #333;
        color: white;
        padding: 10px   20px;
      }

      /* Main content */
      .content {
        margin: 20px;
        font-family: Arial, sans-serif;
      }

      /* Footer styles */
      footer {
        border-top: 1px solid #ccc;
      }
    `;
			const expected =
				"header{background-color:#333;color:white;padding:10px 20px;}.content{margin:20px;font-family:Arial,sans-serif;}footer{border-top:1px solid #ccc;}";
			expect(minifyCss(input)).toContain(expected);
		});

		it("should handle empty input", () => {
			expect(minifyCss("")).toBe("");
		});

		it("should handle input with only comments", () => {
			const input = `/* This is just a comment */
    /* Another comment */`;
			expect(minifyCss(input)).toBe(" ");
		});
	});

	describe("minifyImports", () => {
		it("should not modify imports without type keyword", () => {
			const input = `import { Component, OnInit } from '@angular/core';`;
			const expected = `import {Component,OnInit} from '@angular/core';`;
			expect(minifyImports(input)).toBe(expected);
		});

		it("should minify imports with type keyword by removing space after type", () => {
			const input = `import { Component, type OnInit } from '@angular/core';`;
			const expected = `import {Component,typeOnInit} from '@angular/core';`;
			expect(minifyImports(input)).toBe(expected);
		});

		it("should handle multiple type keywords", () => {
			const input = `import { type Component, type OnInit, Injectable } from '@angular/core';`;
			const expected = `import {typeComponent,typeOnInit,Injectable} from '@angular/core';`;
			expect(minifyImports(input)).toBe(expected);
		});

		it("should handle imports with extra whitespace", () => {
			const input = `import {   Component  ,   type   OnInit   } from '@angular/core';`;
			const expected = `import {Component,typeOnInit} from '@angular/core';`;
			expect(minifyImports(input)).toBe(expected);
		});

		it("should handle multiple import statements", () => {
			const input = `
      import { Component } from '@angular/core';
      import { type RouterState, Router } from '@angular/router';
      const x = 5;
    `;
			const expected = `
      import {Component} from '@angular/core';
      import {typeRouterState,Router} from '@angular/router';
      const x = 5;
    `;
			expect(minifyImports(input)).toBe(expected);
		});

		it("should handle multiline import statements", () => {
			const input = `import {
      Component,
      type OnInit,
      Injectable
    } from '@angular/core';`;
			const expected = `import {Component,typeOnInit,Injectable} from '@angular/core';`;
			expect(minifyImports(input)).toBe(expected);
		});

		it("should not modify non-import statements", () => {
			const input = `
      const obj = { type: 'something' };
      function it() { return { a: 1, type: 'value' }; }
    `;
			expect(minifyImports(input)).toBe(input);
		});

		it("should handle empty imports", () => {
			const input = `import { } from '@angular/core';`;
			const expected = `import {} from '@angular/core';`;
			expect(minifyImports(input)).toBe(expected);
		});

		it("should handle multiple spaces between type and identifier", () => {
			const input = `import { type    Component } from '@angular/core';`;
			const expected = `import {typeComponent} from '@angular/core';`;
			expect(minifyImports(input)).toBe(expected);
		});

		it("should preserve other parts of the import statement", () => {
			const input = `import { Component, type OnInit } from '@angular/core' as core;`;
			const expected = `import {Component,typeOnInit} from '@angular/core' as core;`;
			expect(minifyImports(input)).toBe(expected);
		});
	});

	describe("minifyJs", () => {
		test("should preserve template literals", () => {
			const input = "const greeting = `Hello, ${name}!`;";
			const result = minifyJs(input);
			expect(result).toContain("`Hello, ${name}!`");
		});

		test("should preserve regular expressions", () => {
			const input = "const regex = /^[a-z]+$/i; const num = 10 / 2;";
			const result = minifyJs(input);
			expect(result).toContain("/^[a-z]+$/i");
			expect(result).toContain("10/2"); // Division should be preserved but spaces removed
		});

		test("should preserve important JSDoc comments", () => {
			const input = `
      /**
       * @param {string} name - The name parameter
       * @returns {string} A greeting message
       */
      function greet(name) {
        return 'Hello, ' + name;
      }

      /** This is not an important comment */
    `;
			const result = minifyJs(input);
			expect(result).toContain("@param");
			expect(result).toContain("@returns");
			expect(result).not.toContain("This is not an important comment");
		});

		test("should NOT preserve non-important JSDoc comments", () => {
			const input = `
      /**
       * This async function is awesome
       * @async
       */
      function greet(name) {
        return 'Hello, ' + name;
      }

      /** This is not an important comment */
    `;
			const result = minifyJs(input);
			expect(result).not.toContain("awesome");
			expect(result).not.toContain("@async");
			expect(result).not.toContain("This is not an important comment");
		});

		test("should remove single-line comments", () => {
			const input = `
      const x = 5; // This is a comment
      // This is another comment
      const y = 10;
    `;
			const result = minifyJs(input);
			expect(result).not.toContain("This is a comment");
			expect(result).not.toContain("This is another comment");
			expect(result).toContain("const x=5;const y=10;");
		});

		test("should remove multi-line comments", () => {
			const input = `
      const x = 5;
      /* This is a
         multi-line comment */
      const y = 10;
    `;
			const result = minifyJs(input);
			expect(result).not.toContain("This is a");
			expect(result).not.toContain("multi-line comment");
			expect(result).toContain("const x=5;const y=10;");
		});

		test("should remove extra whitespace", () => {
			const input = `
      const   x    =   5;
      const   y    =   10;
    `;
			const result = minifyJs(input);
			expect(result).toContain("const x=5;const y=10;");
		});

		test("should compact newlines", () => {
			const input = `
      const x = 5;

      const y = 10;

      const z = 15;
    `;
			const result = minifyJs(input);
			expect(result).not.toContain("\n");
			expect(result).toContain("const x=5;const y=10;const z=15;");
		});

		test("should handle spaces around operators", () => {
			const input = `
      const sum = a + b;
      const diff = a - b;
      const product = a * b;
      const quotient = a / b;
      const remainder = a % b;
      const isEqual = a === b;
      const isGreater = a > b;
      const isLess = a < b;
      const ternary = condition ? true : false;
    `;
			const result = minifyJs(input);
			expect(result).toContain("const sum=a+b;");
			expect(result).toContain("const diff=a-b;");
			expect(result).toContain("const product=a*b;");
			expect(result).toContain("const quotient=a/b;");
			expect(result).toContain("const remainder=a%b;");
			expect(result).toContain("const isEqual=a === b;");
			expect(result).toContain("const isGreater=a>b;");
			expect(result).toContain("const isLess=a<b;");
			expect(result).toContain("const ternary=condition?true:false;");
		});

		test("should handle spaces around parentheses and brackets", () => {
			const input = `
      function add( a, b ) {
        return a + b;
      }
      const arr = [ 1, 2, 3 ];
      const obj = { a: 1, b: 2 };
    `;
			const result = minifyJs(input);
			expect(result).toContain("function add(a,b) {");
			expect(result).toContain("const arr=[1,2,3];");
			expect(result).toContain("const obj={a: 1,b: 2};");
		});

		test("should handle nested structures correctly", () => {
			const input = `
      const complex = {
        array: [1, 2, [3, 4]],
        object: { a: { b: 1 } },
        template: \`Value: \${getValue({key: 'test'})}\`
      };
    `;
			const result = minifyJs(input);
			expect(result).toContain("const complex={");
			expect(result).toContain("array: [1,2,[3,4]]");
			expect(result).toContain("object: {a: {b: 1}}");
			expect(result).toContain("template: `Value: ${getValue({key: 'test'})}`");
		});

		test("should handle complex regular expressions", () => {
			const input = `
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
      const urlRegex = /https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)/;
    `;
			const result = minifyJs(input);
			expect(result).toContain(
				"/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/",
			);
			expect(result).toContain(
				"/https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)/",
			);
		});

		test("should handle edge case with division operator vs regex", () => {
			const input = `
      const division = 10 / 2;
      const regex = /pattern/g;
      const complexCase = a / b / c;
    `;
			const result = minifyJs(input);
			expect(result).toContain("const division=10/2;");
			expect(result).toContain("const regex=/pattern/g;");
			expect(result).toContain("const complexCase=a / b / c;");
		});

		test("should handle multiple template literals", () => {
			const input = `
      const template1 = \`Hello, \${name}!\`;
      const template2 = \`Count: \${1 + 2 + 3}\`;
      const nested = \`Outer \${\`Inner \${value}\`}\`;
    `;
			const result = minifyJs(input);
			expect(result).toContain("`Hello, ${name}!`");
			expect(result).toContain("`Count: ${1 + 2 + 3}`");
			expect(result).toContain("`Outer ${`Inner ${value}`}`");
		});

		test("should handle real-world JavaScript code", () => {
			const input = `
      import { useState, useEffect } from 'react';

      /**
       * @description Custom hook for fetching data
       * @param {string} url - The URL to fetch from
       * @returns {Object} The fetched data and loading state
       */
      function useFetch(url) {
        const [data, setData] = useState(null);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);

        useEffect(() => {
          // Skip if no URL provided
          if (!url) return;

          const fetchData = async () => {
            try {
              const response = await fetch(url);
              const result = await response.json();
              setData(result);
            } catch (err) {
              setError(err);
              console.error("Error fetching data:", err);
            } finally {
              setLoading(false);
            }
          };

          fetchData();

          // Cleanup function
          return () => {
            // Cancel any pending requests if needed
          };
        }, [url]);

        return { data, loading, error };
      }

      export default useFetch;
    `;

			const result = minifyJs(input);

			// Check that important JSDoc is preserved
			expect(result).toContain("@description");
			expect(result).toContain("@param");
			expect(result).toContain("@returns");

			// Check that code structure is preserved but minified
			expect(result).toContain("function useFetch(url) {");
			expect(result).toContain("const [data,setData]=useState(null);");
			expect(result).toContain("useEffect(() => {");
			expect(result).toContain("if (!url) return;");
			expect(result).toContain("const fetchData=async () => {");

			// Check that comments are removed
			expect(result).not.toContain("// Skip if no URL provided");
			expect(result).not.toContain("// Cleanup function");

			// Check that export is preserved
			expect(result).toContain("export default useFetch;");
		});
	});

	describe("minifyFileContent", () => {
		it("should not run minification on empty content", async () => {
			const content = "";
			const result = await minifyFileContent("test.js", content);
			expect(result).toBe(content);
		});

		it("should not run minification on small content", async () => {
			const content = "const sum = a + b;".repeat(1);
			const result = await minifyFileContent("test.js", content);
			expect(result).not.toContain("const sum=a+b;");
		});

		it("should run minification on content big enough", async () => {
			const content = "const sum = a + b;".repeat(10);
			const result = await minifyFileContent("test.js", content);
			expect(result).toContain("const sum=a+b;");
		});
	});
});
