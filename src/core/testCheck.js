// Heuristic: did this change include any test files?
// Recognises common conventions across JS/TS, Python, Java, Go, Ruby, etc.
const TEST_PATTERNS = [
  /(^|\/)__tests__\//i,
  /\.(test|spec)\.[jt]sx?$/i, // foo.test.js, foo.spec.ts
  /(^|\/)tests?\//i, // test/ or tests/
  /_test\.(py|go|rb)$/i, // foo_test.py, foo_test.go
  /test_.*\.py$/i, // test_foo.py
  /(^|\/)spec\//i, // spec/
  /Test\.java$/i, // FooTest.java
  /Tests?\.cs$/i, // FooTest.cs / FooTests.cs
];

/**
 * @param {Array<{filename:string,status:string}>} files
 * @returns {{ hasTests: boolean, testFiles: string[], hasCodeChanges: boolean }}
 */
export function checkTestsAdded(files) {
  const testFiles = files
    .filter((f) => f.status !== 'removed')
    .filter((f) => TEST_PATTERNS.some((re) => re.test(f.filename)))
    .map((f) => f.filename);

  const codeFiles = files.filter(
    (f) => f.status !== 'removed' && !TEST_PATTERNS.some((re) => re.test(f.filename))
  );

  return {
    hasTests: testFiles.length > 0,
    testFiles,
    hasCodeChanges: codeFiles.length > 0,
  };
}
