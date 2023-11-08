
given some glob path, get the list of behavior files
this should return an Array of objects with the filename
and whether they should be run on the server or browser

Determine whether there are any picked examples somehow
Could check to see if there is a .pick() in the file anywhere ...
But seems a little risky maybe

Then iterate over using OrderProvider
Execute each behavior

Note that for behaviors that need to run on the server but
use playwright for the tests ... we need to somehow provide an
instance of playwright or something ... for the pattern we typically
use we'd need to start vite and have playwright running.

Once we have vite running, we have the ability to load whatever in
the browser. We need that to load behaviors in the browser. AND it's also
now server-side behaviors that test against the browser work too -- they need
to load a page via Playwright.

So, server-side behaviors also need some extra stuff ... they need a reference
to Playwright at least and a running instance of Vite so they can request
that particular things get loaded for the behavior execution. 

How would a behavior get access to that? We could potentially have a module
that you could import during the behavior to get access to the running
Playwright. And it lazy starts Playwright I guess the first time it's requested.

I guess any args for Playwright could be in a config file or some kind of JS that
'provides' Playwright. Maybe that's actually a better way for plugins ...

We want like a server/browser combo I think, a local browser. So you should be
able to configure the server and configure the browser. I guess we could configure it
to either provide one Page or a Page per example ... it could be that we provide
a PlaywrightContext which is a `<Context<BrowserContext>>` or something that an example
could use if it wanted Playwright. We could also provide a PlaywrightPageContext which
is a `Context<Page>` if you just needed a particular page -- and it would open a page
if one isn't already open.

I kind of wish there were a way to easily chain Contexts ... but that seems a bit too
fancy. It's just that here we'd need to remember to call the teardown method on the
`Context<BrowserContext>` context if we wanted to ... otherwise it would just continue to
generate a new browser context or whatever. That's what we do right now anyways.

So for server behaviors, if they need a Browser then they just use the
`Context<BrowserContext>` in the example and they can choose to tear it down at the
end or not. And by using this, it will automatically start Vite and Playwright.
So this is just something that best-behavior will have to export, even though it's
also a command line tool. I guess that's ok.

### Figuring out if an example has been picked

We have a few options:

1. Load the behavior and run any configurable example functions
- Pros: unambiguous results
- Cons: would need to load and run in the proper environment

2. Look for `.pick()` text
- Pros: fast? and can do it on the servrer side
- Cons: Could potentially get a false positive

3. Parse the Typescript
- Pros: could do it all on the server side
- Cons: Could be slow; Requires typescript; Would need to somehow inspect the content
of a function, which I'm not sure you can do.

4. Add a cli flag like `--pickedOnly` -- and then you are telling it that there are
picked examples
- Pros: Super easy, fast, etc
- Cons: Have to do two things -- pick an example and then run --pickedOnly.

1) is the best obviously. And since to run the examples we have to load them somewhere
anyway, it's not really that bad. The only downside is that it makes it more difficult
to do parallel execution ... or at least you need to do one pass first to load all
examples, and then you'd need to load them again in different processes to execute them
in parallel.

But note that Jest does not respect `.only` across files ... only within a test module.
So to only run one test you have to use `.only` and then run only that file.

4) Works ... and it's kind of nice because even if you check in a picked example
then unless you run with this flag it will still run everything. And it's actually
kind of nice because you can easily switch from running all to just running the test
you care about.


### Transpiling

ALSO we're going to need someway to transpile behaviors that are run on the server ...
I wonder if we could use Vite also and just import via a URL? But unfortunately Node
does not support http/s imports yet -- or it has only experimental support in Node 18

However, we could leverage the vite dev server's `ssrLoadModule` function which does
exactly what we need I think.

### General Hazy Approach

#### First Pass - Only Server-side

1. Get Behavior meta-data (filename)
2. Load and exeute each behavior without any external transpiling; print the
logs to standard out and the summary

#### Second Pass - Server-Side and Browser-Side
1. Get Behavior meta-data (filename, and runtime context)
2. Load and execute both server and browser side behaviors; print the logs to standard
out and the summary

#### Third Pass
Load and execute each behavior in a separate process so you can have an indefinite
number of behaviors

#### Fourth Pass
Be able to run 'behavior processes' in parallel


### What do we call tests that are not browser based?

- node tests?
- server tests?
- external tests?
- integration tests?

These are tests that run in node (or some other JS runtime) and may target
a Browser through the Playwright APIs. Maybe these are local tests? as opposed to
browser tests?


### Can we make the abstractions in esbehavior better to support writing runners?

What do you need to do to run behaviors?

1. Get the list of behaviors
2. Somehow pick the next behavior to run (this could happen in different ways)
3. Run the behavior
- but this depends now on failing fast (whether something has failed already)
- and on how you handle picking examples (Should I run only picked or not? how do you decide)
4. iterate over the examples (this we don't think would change)
5. decide whether to validate or skip
6. Validate or skip the example

So what are the configurable points:
1. How we get behaviors
2. How we order behaviors and examples (via OrderProvider)
3. How we run the behaviors (do we iterate over the list? do we run in parallel?)
4. How we decide whether to run picked behaviors only (whether some example is picked,
or whether flag is given)

(4) is about providing the correct validator/runner, but could that be reused?
(3) is about what we do with the list of behaviors

But the trick is that whatever iterates over behaviors needs to hold some state --
did a previous behavior fail? if we are failing fast we need to skip upcoming behaviors
Are we only running picked examples?

But note that if we run behaviors in parallel, we aren't going to be able to stop
everything exactly when something fails ... unless we somehow do that at the
reporting layer


### Running browser behaviors

We have a bunch of stuff we might be able to re-use -- the BehaviorRunners -- which
captures the logic of running a behavior. We could enhance this with a DocumentationRunner
that captures the logic of running a set of behaviors (failFast etc).

In order to plug into this and re-use it, we *could* try to create a subclass or
implementation of `Behavior` and `Example` that somehow allows for these to be
*remote* -- either running in a separate process or running in a browser.

We can load async the behavior metadata and this could create a RemoteBehavior. We
can definitely get the description and at least the number of examples.

The RemoteExample just needs to implement Validate and Skip methods, which are both
async -- so this should be no problem to run remotely. So the RemoteBehavior's
`examples` property could return an array of `RemoteExample`. 

The only trick is how to handle ConfigurableBehavior and ConfigurableExample.

For behaviors, it's enough to probably get the validation mode and return it with
other meta data. And same with examples? If we are failing fast then we just call
skip on the example so it doesn't matter what the validation mode is. In any case
it always seems like we just override whatever the validation mode is when we
need to. So maybe instead of taking ConfigurableExamples, the runner functions should
take ConfiguredExamples that have a validation mode associated with them.

The nice thing about taking `ConfigurableExample` is that it is already exposed
by esbehavior, so we don't need a new concept. We could easily get the validation mode
when we return the metadata and just have all `RemoteExample` be wrapped in a function
that sets the validation mode we fetched on an ExampleOptions object.

It's weird because configurable example is not really about configuring the example,
it's about asserting some constraints on how that example should be run. It's like
the preferred run method, all things considered.

The real question is: what's the best way to get more complicated JS into the
browser for evaluating behaviors and examples? Basically I just need to be able
to determine validation mode, but it would be great to be able to load the ExampleOptions
type etc.

The best would be to load via the local server. But for that I need the path
to an index.html file.

### Loading the browser adapter

We decided to use vite to build this as an esmodule that we could load from disk
and evaluate in the browser. This approach isn't dependent on the vite config at
all so we don't have to worry that vite can actually access particular files deep
in node_modules or whatever.

But we still need to find the correct file to load. We can use this to do it
dynamically:

function dirName() {
  return url.fileURLToPath(new URL('.', import.meta.url))
}

### Designating browser specs and ??? specs

basically we need to somehow define the capabilities for a behavior
- Does it need a browser environment?
- Does it need a node environment?
How can we do this?

1. JS Directive in first line of file
2. two different glob paths
3. some other file in each directory that defined the capabilities required by
behaviors in that directory.
4. Well known filenames (*.local.behavior.ts; *.browser.behavior.ts)
5. Specific directory names (*/local/*; */browser/*)

I can't actually evaluate the file since it may depend on things specific
to a browser environment.

The two glob approach seems good but (1) not sure what to name the non-browser
glob and (2) what if the globs overlap?

The directive approach is nice but requires that extra step and if you don't have
multiple environments used in your test suite then it seems not really
necessary -- that's why we have a default environment option. Also, this approach
seems inefficient in that we have to peek at the first line of every behavior.

Well known filenames or directory names seem too prescriptive.

Something like a dotfile in each directory seems interesting. But also feels like
a little too much ...

If you think of best-behavior as primarily a tool to run specs that /need a browser/
then you could think of the distinction as between those specs that run
*outside* a browser and those that run *inside* a browser. Specs that run outside
could also still target a browser in the sense that they load something in a
browser and use playwright to inspect it.

For specs run outside a browser ... is there a nice way to make the playwright
browser and the local server available to specs without too much work?

We can provide a playwrightBrowserContext that starts a context on init and
either destroys it or keeps it open. We could also provide a localServer
context that provides a `url` function to load a local file at some path in
a browser.

Maybe we provide a context that combines both. Or at least exposes the `url`
function from the local server. In a test that's all we need from local server.
But we need to access the details of the playwright browser during a test
usually.

It would be so great if best-behavior didn't care about playwright at all but
just knew about a browser and the test writer would care that it was playwright.
We really do need it though to set up all the stuff for specs that run inside
a browser.

Note that the only reason BrowserBehavior needs a local server is to get the
url for a file on disk it wants to load. Otherwise, it just needs Playwright.
So I wonder if we make the PlaywrightBrowser depend on the local server, it
would be more useful ... then we just have a PlaywrightBrowserContext that
we can use during a test and it knows how to load local files. Something like:

```
context.newPage("/blah/blah.html")
```

or

```
context.load("/blah/blah.html", { newPage: true })
```

Maybe this is still something distinct from playwright browser, but we call it
`localBrowserContext()`

How could this work though? Especially if the outside specs are running in a
separate process from the main runner? In the parallel case, we would want
each process to have its own BrowserContext (ie not its own instance of playwright).
I think? That's what elm-spec does at least. But how could a separate process
know about an existing playwright?

Note that there is a way to launch a 'browser server' and then use a `connect`
function to connect to it.

But if you're doing crazy stuff with local storage or something this still
might run into problems even if you do different contexts. It's probably not
that big of a deal to start a separate browser for each process?

But even within a process ... how do we get access to the local server and
browser instance? Do we add these to the global object or something? Could
we inject them into a behavior? Probably best to use the singleton pattern
for both local server and browser in any case since we only want one of
these per process at most. 

So:

- Turn PlaywrightBrowser and ViteServer into singletons
- Create a `localBrowserContext()` that returns some object with a load method
that can create a new page (or not) and load some local resource and then
returns a Playwright Page object. It could probably also have a function to
return the browser context too for max flexibility I guess.
- And on teardown it should decide whether to close the page or not based
on any flags and whether we are showing the browser or not.

Actually, though, our approach where we use vite to load the behavior
module may be working against us. It probably bundles that module and then
evaluates it somehow. But when it does so, it is probably bundling in the
index module where the 'container' is stored and then evaluating that. So it
has a separate copy of that 'module variable' called container, which does
not have a browser or vite server set yet.

So how do we give it a reference to vite / playwright?

We can use the globalThis object and so long as we are careful about when
we set things on it, the module loaded by Vite will use the very same
instance of that. So we could set a 'container' on globalThis that contains
a reference to vite and playwright. But should we do this?

Ultimately we want to have local specs running in their own process so that
we could potentially run these in parallel. In that case, we would presumably
have some script that starts the process and waits for a message about which
behavior to load and run. And so that process would also need to load the
behavior and that process would have its own instance of playwright and I guess
it would have to have its own instance of vite dev server in order to use the
loadModule function (unless we were somehow able to get http imports working
with node ... maybe a reason to switch to deno? ha) So no matter how we get
that working we would still need to load the module, and if that module expects
some kind of global state with a reference to the playwright browser then we
would probably need to do something like we're doing.

Alternatively, we could say that if you want to use playwright, you need to
expose a function instead of a behavior. The problem is though that we already
do that in order to configure the behavior. So how would we determine
whether the function is to pick/skip the behavior or requesting a browser
context?

Leveraging the Context idea seems perfect here. We just need a nice way to
make the current instance of the browser available ...

We could potentially use the BehaviorOptions object to pass in an object
that could serve as this for the context initialization function. Or even
could just serve as an argument to the context initialization function.
Would that make sense more generally?

Then maybe Context would actually be something like `Context<T, M = undefined>`
where M is some argument to the context initialization. And then if you
want to use a local browser context you define a context like:

`Context<MyTestContext, LocalBrowserContext>`

and then the function is:

```
function myTestContext(): Context<MyTestContext, LocalBrowserContext> {
  return {
    init: (localBrowserContext) => new MyTestContext(localBrowserContext)
  }
}
```

Could this be a way to chain contexts? so maybe the other type is actually
a `Context<LocalBrowser>` that has init and teardown, and it will get initted
before being passed on to the next? But how would we kick off that chain?
By setting some rootContext on BehaviorOptions?

We could have a notion of a BehaviorContext ... but that's not actually what
we want here, ie some state that would persist through all examples. BUT
that is exactly what we want ... we want the PlaywrightBrowser and the ViteServer
to be available for all examples ... we don't want to start and stop the
browser for each example, for instance, we would just want to potentially
close and reopen the browser context (if that).

And so how would you set the BehaviorContext? potentially through the BehaviorOptions.

Would we want to have BehaviorContext have an init/teardown? or would it
just be an object?

But this is risky ... if we expose this on the BehaviorOptions then a test writer
could also use that ... and then what would BestBehavior do? overwrite that
value or subsume it or something?

So it could just be an attribute set on the DocumentationRunner validation options
when the run function gets called for each behavior. That is something that only a
esbehavior runner would call ... But note that DocumentationRunner doesn't know
anything about contexts ... that's a detail of a particular implementation of
Example. We'd have to make ExampleValidationOptions contain some context object
or something ... But then we'd want to worry about the type of that context object
and it could get kind of tricky. Because what would that type even mean for some
other implementation of Example that doesn't have contexts?

We just ended up doing `useLocalBrowser` which is just a function that returns a
`Promise<LocalBrowser>`. This is more flexible. Best-behavior should not know about
Context and stuff like that since that is just a feature of a particular type of
example implementation anyway.

### So called 'component' tests

Currently we can run specs outside a browser, in a node process. And we can use
`useLocalBrowser` to get access to a browser that can load local files, which
allows us to exercise code in the browser during the test. It might be nicer
though if we didn't have to specify that html file. Could we somehow provide
a function that gets loaded and executed in the browser as part of running
the example? We would still need to do all the same things behind the scenes:
bundle the code, open a browser page, load the code, and execute the code at
the right time. Then we'd need to somehow clean everything up. It's kind of
like a Context, where it would have an init function and a teardown function.
But it would be like a `BrowserContext`

One thing we could potentially do is require that specs that do this expose
a function with a specific name. And this would return a BrowserContext, and
the init function would take arguments (serializable) that could be passed
up during the test. We'd need to provide some kind of function like
`useBrowserContext(args)` that could be called at an arbitrary time during the
test. And that would somehow register the Context, call init with the passed
in argumenbts, and then call `teardown` at the end of the example.

There's a few things I might be able to do here to make this work. 

First, `import.meta.env.SSR` is a boolean that tells whether you are on the
client or the server, and it results in tree shaken code apparently. So,
theoretically, if we had a `createBrowserContext` function, it could wrap
things in this and then just do nothing if on the server.

Second, the vite plugin gets an ssr flag. So, if in SSR we could potentially
just remove the `createBrowserContext` function. And if in the browser, we
could remove the default export maybe.

This is an example of a rollup program that strips out exports:

https://github.com/xeroxinteractive/rollup-plugin-strip-exports/blob/next/source/index.ts

This thing might be useful for generating source maps

https://www.npmjs.com/package/magic-string

So the plugin would just determine whether its for ssr or not and if so
then delete the exported function to render and if not then delete the default
export with the behavior. And then allow other stuff to run so anything no
longer relevent gets tree shaken. Would it work?

It would also depend on /whether/ there were an export for the browser context.
If so, then you are saying that the behavior should run on the server and the
browser context should be loaded in the browser. So for these types of behaviors
we'd want to load the file on the server side and also on the browser side.
