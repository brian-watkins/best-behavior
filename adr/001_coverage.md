# Code Coverage

Code coverage metrics are often used in conjunction with testing tools to give
some indication of whether the test suite does a good job at exercising
the code. Coverage metrics, of course, can only do so much; they do not indicate
if a test suite will fail in the right ways should the code change in ways
that introduce regressions. And it is very easy to game coverage metrics by
writing tests that exercise code, but don't do much in the way of asserting
about what should be the case. Plus, there are sometimes good reasons *not* to
test certain pieces of code. Nevertheless, it is common to find orgs using code
coverage metrics as some measure of 'quality' ...

For us, code coverage is important in two cases:

1. If you find yourself working with existing code thaht has not been tested,
code coverage metrics can help you know whether you are on the right track when
you start to fill in tests for this code. You should see the numbers go up! And
the data can point you to cases that your tests need to consider.
2. If you are doing a large refactor, you might start to wonder whether you've
accidentally introduced new cases that your tests (which continue to pass)
do not cover. Code coverage metrics can point you to areas of the code that were
introduced without testing -- you could decide to remove these cases or write
tests for them now.

So, best-behavior should make it easy to generate code coverage metrics while
running the suite of behaviors.

The ecosystem for code coverage is bit complicated, however, and so we need to
decide *how* we should support code coverage.

### Context

There are two main strategies right now in the Javascript world for collecting
code coverage metrics:

1. Use [Istanbul](https://istanbul.js.org) to instrument Javascript code so that
coverage metrics will be recorded as it is exercised. And use
[nyc](https://github.com/istanbuljs/nyc) to create reports from that data.

2. Use the javascript engine's native code coverage collection capabaility. For
example, the Chrome browser can generate code coverage metrics for Javascript that
is executed on a page (by the V8 runtime). And Node can generate code coverage
metrics for Javascript executed by the V8 runtime.

There are pros and cons for each approach, but generally (1) seems like it adds
more overhead, as the Javascript code itself needs to be instrumented in some way.
Generally, this is done as part of the build/bundling step before tests are
executed. Best-behavior uses vite for this process, and there is a plugin that
instruments generated code using Istanbul called
[vite-plugin-istanbul](https://www.npmjs.com/package/vite-plugin-istanbul). However,
this plugin only applies to code that is served by the Vite dev server -- it is
explicitly turned off by server-side rendered code. And since we use vite's ssr
mode to transpile node-based behaviors, this means we'd have to come up with
another solution for instrumenting those. The reason for this, I think, is that
Istanbul uses the `window` object to store coverage metrics as the code is
exercised. No doubt there is some way to get this working, but it doesn't feel
like a straightforward approach.

Approach (2) seems better, as the Javascript runtime can instrument code at a
lower level for better performance and accuracy. However, there are some complications
with this approach.

Even though Chrome and Node share the V8 runtime, they produce code coverage
metrics in two slightly different formats.

- Chrome (via Playwright at least) produces an array of objects for each file,
with data about generated sources (and sourcemaps) embedded in the object.
- Node produces an object, with an attribute that is an array of objects describing
coverage data for each file, and an attribute that is a `source-map-cache` with
sourcemaps for each file. The sourcemap cache contains the raw (unencoded)
sourcemap for each file plus a list of line numbers for the generated code; it does
not contain the generated code itself.

Best-behavior can run behaviors in either the browser or Node, so we would
presumably need to deal with both kinds of formats in some way, should we use
native (V8) code coverage collection.

Furthermore, there are a few different tools to deal with coverage data in these
formats.

- [v8-to-istanbul](https://www.npmjs.com/package/v8-to-istanbul) can convert V8
coverage data to Istanbul format so that one can use `nyc` to generate reports. This
definitely works with the coverage data that Chrome (via Playwright) produces; it
may also work with Node coverage but not sure.
- [c8](https://www.npmjs.com/package/c8) is a cli much like `nyc` that generates
native V8 coverge for Node and then can produce reports. I think it uses
`v8-to-istanbul` under the hood somehow. This tool does *not* work with code
coverage data from Chrome (via Playwright) without transformation.
- [monocart-coverage-reports](https://www.npmjs.com/package/monocart-coverage-reports)
is a newer tool that works with V8 or Istanbul data to generate reports. It has
a nice default HTML report. It works with V8 coverage data generated by Chrome but
it does *not* work with V8 coverage data generated by Node. Note that `c8` has
support for using this tool, so maybe that is an implicit endorsement for the
future.

Both `c8` and `nyc` have a node where the tests are run *with* `c8` (or `nyc`) which
causes instrumentation and report generation to happen automatically. For, `c8`
this happens by setting the `NODE_V8_COVERAGE` environment variable. When this
is set, Node will automatically generate coverage data and save it to the directory
specified in the environment variable. 

The benefit of this approach is that `c8` uses the same config as `nyc` so there
is some familiarity there.

There are some drawbacks, however. This approach would force
us to use the Node format for code coverage data; we'd need to transform coverage
for browser-based behaviors to this format. And we might have less control over
any transformations we might need to do to coverage data for node-based behaviors.
This also generates a lot of extra data; if we control the production of code
coverage data we can filter out data for node internals and node modules before
writing anything to disk.


### Decision

We will use native code coverage collection, because it is presumably faster and
more reliable, and we do not need to add any other dependencies to support this.

To generate code-coverage, we will add a configuration parameter. When this
parameter is set, then coverage will be collected. (ie instead of, for example,
running the tests with `c8` to enable coverage)

For now, at least, best-behavior will normalize the code coverage data for
browser-based behaviors and node-based behaviors to the format generated by Chrome
(an array of objects with code coverage data, generated source information, and
sourcemaps). By default, we will supply code to use monocart-coverage-reports
to generate reports based on this data. Note that MCR can generate the basic
Istanbul reports plus more formats as well. And it's default HTML report is
much nicer than the Istanbul HTML reoprt.

We will also supply an interface so that test writers can get access to the
raw V8 code coverage data (in Chrome format) so that they could use
`v8-to-istanbul` to transform this data to Istanbul format for use with
`nyc` if needed.


### Implementation Decisions

Collecting code coverage for browser-based behaviors is relatively straightforward.
Playwright offers an API to get this data. However, due to the way that
Vite generates sourcemaps we did need to modify this data to get accurate
paths to the files. We need to update the (file) url of the coverage data to
include the relative path to the file. We also needed to add a `sourceRoot`
attribute to the sourcemap with the same relative path.

Collecting code coverage for node-based behaviors is a little more tricky
due to the fact that we are using Vite to transpile these behaviors before
running them.

Previously, we had been calling the Vite dev servers `loadSSRModule` function
to load and transpile the behavior module. This works, but did not work well
with code coverage. When Vite loads a module for SSR, it wraps the transpiled
code in an anonymous async function and then executes it. It also adds a
`"use strict";` directive at the top of this function and adds a sourcemap
to the end. When node code coverage is enabled, node can correctly interpret
the sourcemap for this anonymous function and associate it with a particular
file on disk. However, the line numbers in the coverage report are messed up
since the sourcemap's mappings refer to the generated code only, whereas Node's
coverage data includes the surrounding async function and `"use strict";`
directive.

It is possible to fix up things so that the line numbers are correct, but it
felt like the cost of this is that best-behavior knows way too much about vite
internals, which could change from version to version. Indeed, during development,
a new version of Vite was released which actually did change some of these
details.

We therefore decided to take another approach for transpiling node-based behaviors.
We will still use Vite but we will do two things differently:

1. We will use Vite's experimental option to disable SSR transforms. This means
that Vite will simply produce transpiled code for us and will leave all the
imports unaffected.
2. We will write a custom Node esm loader that uses Vite to get the transpiled code
and sourcemap. By hooking into the loader process, we no longer need to have
Vite wrap the transpiled source in an async function and evaluate it to get the
module.

Once we did these two things, now the code coverage metrics generated for
node-based behaviors have accurate line numbers.

Finally, for node-based behaviors, we use the inspector api to start and stop
code coverage manually. When we do this, we actually get an array of objects
with code coverage data much like what Chrome (via Playwright) generates. We
just needed to add an attribute to each object with the generated source and
sourcemap information, which we cache when we transpile the file in our
custom esm loader.

We had to use absolute paths in the sourcemaps because otherwise Node would get
confused when generating stack traces. It apparently uses the sourceRoot and
sources fields from the source map and just concats them together (without
using `path.join` or the like) to get the file path for stack traces. If we
use absolute paths for the sources attribute in the source map then it works
fine.


### Caveats

In the future, we might find that we need to provide code coverage data
in a more flexible format or in a way that could support different tools
than the one's we've mentioned. However, since `MCR` seems to include all
the reporting capabilities of `c8` and `nyc` then it seems fine to use
it as our default for now, knowing that we have a way to convert the
data we collect to istanbul format (via a custom CoverageReporter that
applies `v8-to-istanbul` to each file object) if we need to.