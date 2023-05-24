# Node CLI perf package

![npm](https://img.shields.io/npm/v/@node-cli/perf?label=version&logo=npm)

> Performance tools for nodejs command-line applications.

## Performance

The class Performance is a wrapper around [nodejs Performance measurement APIs](https://nodejs.org/api/perf_hooks.html).

It is intended for an extremely simple case:

- start performance monitoring
- do something that takes a while
- stop performance monitoring
- read how much time passed between start and stop (in milliseconds)
- rinse and repeat

### Methods

| Method | Description                                      |
| ------ | ------------------------------------------------ |
| start  | Starts measuring performance                     |
| stop   | Stops measuring performance and store the result |

| Getter           | Type   | Description          |
| ---------------- | ------ | -------------------- |
| results          | Object |                      |
| results.duration | Number | Time in milliseconds |

### Examples

#### Basic performance gathering

```js
import { Performance } from "@node-cli/perf;
const perf = new Performance();

// Somewhere in your code, you want to start measuring performance:
perf.start();
// Do long lasting actions
(...)
// When done, tell performance to stop:
perf.stop();
// The duration can now be found in the Performance class getter `results`:
console.log(`It took ${perf.results.duration} milliseconds to run...`);
```

#### Multiple performance gatherings

```js
import { Performance } from "@node-cli/perf;
const perf = new Performance();

// Somewhere in your code, you want to start measuring performance:
perf.start();
// Do long lasting actions
(...)
// When done, tell performance to stop:
perf.stop();
// Save the results
const res1 = perf.results.duration;

// Further down in your code, start measuring another performance:
perf.start();
// Do other long lasting actions
(...)
// When done, tell performance to stop:
perf.stop();
// Save the results
const res2 = perf.results.duration;

// -> res1 and res2 will have 2 different duration results.
```

## License

MIT © Arno Versini
