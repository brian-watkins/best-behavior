
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

But in order for this to work, we need some way that when we execute a behavior
that uses a display context it knows to initiate the display context. And to
initiate the display context, it needs to load the behavior file, or at least
it needs to load the display context function, which so far we've defined in the
behavior file.

I could do something like:

```
useDisplay("../path/to/the/context.ts")
```

but that feels really lame. 

But note that we could potentially identify a behavior file as a hybrid behavior
based on whether it exports a DisplayContext. And then if it did, could we
somehow inject some metadata about the module?

We could say `import.meta.currentBehavior = path` and maybe that would be availble?
No that doesn't seem to work.

But we can use `globalThis` to do the same thing. and it does work. But feels hacky?
Note that `useLocalBrowser` already uses the globalThis to get access to the local
browser instance.

We're finding though several cases where we need to make certain things available
to a behavior ... the localBrowser (potentially), the path to the behavior file
(potentially), etc. Is there a better way to do this than using the globalThis?

Potentially we could set some stuff on the this object of the functions that get
called as part of the example. But this isn't that great since then we'd have to
do stuff like:

```
useDisplay(this.behaviorMetadata.url)
```

or whatever. When we'd really just like to do this:

```
useDisplay()
```

Also, useDisplay could be called from anywhere really, like in some kind of TestApp
class in a helper file somewhere.

Feels like import.meta is maybe a nice way to provide info to a behavior? But again,
if `useDisplay` is called in some other file, then that files `import.meta` wouldn't
have special properties on it, right? I thought the point was that each module has
its own import.meta.

Or maybe we just need to create some object that's on the global scope that contains
all the details we might want -- reference to local browser, metadata for current
behavior, etc.

Or could we have a module that is stateful which knows this stuff? So some module
that has functions to set some things and then other things like the DisplayContext
module could import it and get values from it?

That seems to work IF we load the module via vite, because then vite will track it
and any other ssr modules that get loaded (ie all the behaviors) will have access
to this same instance of this module if they import it.

But if we were to move to multiple processes for local behaviors, would that mess
this up in some way? Right now we create the context at the very start and
provide it to the runner and the sequentialValidator. But if we had a
concurrentValidator would that change things? Each process would need to have its
own context, and when we create the process we would create a local browser for
that process and we would just set the behavior metadata on it as messages come
in to run various behaviors. Because the process would need to load the behavior.

So ultimately it might be better to have the validator create the context instead
of the root `run` function. But we might make that change when/if we move to
multiple processes because then would the main process need a local browser?
Maybe because that is what would be used to run browser behaviors? But maybe
not because if we want to run multiple browser behaviors in parallel then we
would need to start up multiple browsers like Playwright does? Yes -- multiple
contexts aren't enough because the subject under test could be messing with
local storage or whatever I guess. A browserContext is just a browser session
not a completely isolated instance of the browser. (apparently)

But then that means that we would have a separate process that runs any kind
of behavior. And the question is just whether you start one process or multiple
processes. And the point of the main process is just to get the behavior files
and manage these multiple processes I guess.

I really like using a module to encapsulate this state. But loading the module
via vite seems like it will be problematic, since we would have to figure out
the path and so on I think. And not to mention that when a behavior requires
something it will be via the `best-behavior` module and not through a relative
path which might mean that `best-behavior` gets externalized. In that case,
what we want might just work. But how would we test that? And how could we do it
locally?

We tried using some resolve aliases or something but doesn't seem to be working.

Could we build something like we do with the browser adapters and import that?
Would that help at all?

The thing we need to do is use vite to load a behavior module, because the behavior
could be in typescript or whatever. But once we load that behavior module, we
want to be able to call some functions like `useLocalBrowser` or `useDisplayContext`
and to work, these things need information that belongs to the runtime, like
a reference to the one local browser or the path to the behavior module that is
being evaluated currently (so that it can be loaded in the browser).

We've fixed this before by leveraging the global scope, but that seems so bad.

The problem is that when vite loads the behavior module, it loads its own version
of modules ... it does not reuse the existing import module cache that node has;
vite has its own module cache. So there's really two different modules in this
case.

The right thing to do would be to somehow inject this runtime information into
the behavior somehow. We had been thinking about injecting the context, in which
case we'd still need to do something like:

```
useDisplay(this.context)
```

or something. Ie we would need to pass it explicitly to the `useDisplay` function.
But what if instead we just injected `useDisplay` and `useLocalBrowser` etc? So
then you would do something like:

```
this.useDisplay()
```

The problem there would be to somehow fix the types so the editor wouldn't complain.
Basically, we would allow the runner to set some context that would be bound to all
the functions that compose the example when they ran. If we had such a context defined
then we could execute those functions with `f.call(thisContext)` and it would set
the value of `this` inside the function to the `thisContext` object.

But note too that we might want to call `useDisplay` from some place other than
the function itself. Feels like the module approach is the only way to support this.

So maybe the thing to do is that the behaviorContext module stores its state on
the global this rather than internal to itself. That means we localize global state
to one thing. And it should work if imported normally or via vite ssrLoadModule. The
annoying thing is that we can't use a private symbol since this would get initialized
multiple times.

### tree shaking

OK so now it's possible to remove the disply export when in SSR and the behavior
export when in the browser and use esbuild to tree shake the rest. In order to
remove unused imports we have to set each one to not have side effects. Is this bad?
Could someone want to import a module that has side effects? Maybe so, especially
in the browser ... but there's no other way to tree shake an unused import. So,
we could have an option somehow that specifies a list of modules that do have side
effects. But then we might want to still remove these on the server side or something.
So it's complicated.

Is this a bad approach -- to mix code that runs on the server with code that runs
in the browser in the same file? We could instead do something like a SFC? Note that
Remix has the same problem and has a long page about it:

https://remix.run/docs/en/main/guides/constraints

They describe their approach as using a proxy module to import just the stuff you
care about. We could probably do that instead of parsing the AST and going through.

So, for SSR we would just create a module that exports the default export from the
behavior file. And for the browser we would create a module that exports the `display`
export. Then let vite figure out the rest I guess. That could be a 'pre' module maybe.
And maybe, just maybe, that would take ordinary imports with it. We'd still be left
with the same problem.

We could also do something like name a file. So `displayContext.display.ts` would
contain the display for that behavior? Or, just `useDisplay("./myDisplay.ts")`?
Getting the path right might be the tricky thing here. I guess we could make it
relative to the behavior file?

Note that remix says they load all the file on the server side -- browser and server.
So maybe it's ok if we refer to the display context directly like a module in the
behavior. But we just need to somehow get the path to the file that its in.

I could try something crazy like when you load the module in the browser it just
looks for the useDisplay call and just pulls that out somehow?

Also we aren't getting any type help from useDisplay right now. If it knew the
context then it could pass on the type.

Maybe on the SSR side we could replace any calls to useDisplay with a call to
something else that would actually return a Display object. (or just not do
anything at all). But on the browser side any calls to useDisplay get hoisted
and exported? But we don't want to return anything except the useDisplay call.

Maybe if we required that the useDisplay call happens inside the behavior then
we could find the expression (the argument that it is called with) and hoist
that and export it? But would that be an annoying restriction to have to call
useDisplay in the behavior? It wouldn't be clear /why/ we had to do that certainly.

What if we bundled everything into a single file with the behavior as the entry point?
And then we could definitely find useDisplay and export the expression inside it?

We can do this. But there's lots of cases to consider:
- What if the argument is itself an object expression?
- What if the argument is a reference to a variable that's not exposed
at the top level (so can't be exported directly?)
- something else?

So I have code that I want to run on the server. And I want to run some code on
the client. Maybe useDisplay could be like the marker function? I think I might
need useDisplay to have a thunk as an argument though. Maybe that makes it easier?

```
useDisplay(() => displayContext)
```

The problem though is that if this closure closes over any variables then we won't
be able to actually deal with them at run time. Because the surrounding code never
gets called since we plan to just grab the thunk and export it to run on the browser.

I think we will need to have a named export in the behavior file. Actually, I think
it could be in any file, since we can bundle everything together. And maybe the
thing to solve for is the possibility of having multiple displays that need to
get exported. So if useDisplay references some display, then that thing must
be exported somewhere. And our plugin will need to generate a name for it, so that
when we run useDisplay on the server it asks to load the behavior file and the
particular display context. And then basically we should just find those exports
and somehow select on them to include in the file to ship to the server.

Note that in Next.js for server actions, then say that you need to define the
actions in a separate file and export them. So we could say that too ... put
your display context in a separate file and export it. Then we would need to
take the name and figure out some way to tell the server what to load. I guess we
would read the imports to figure out what file to load? We could maybe even
read the comments from the bundled esbuild output

This is an interesting article on this stuff:

https://www.builder.io/blog/wtf-is-code-extraction

And this is a helpful thing for dealing with an estree structure:

https://astexplorer.net

Note that Playwright's component testing stuff actually works by somehow capturing
values in the test that are changed by the browser code and then inspected by the
test in node. so wild! They have a notion called 'stories' that are basically
wrapper components that manipulate the component under test, setting it up and
translating properties to serializable values that are then somehow set on these
closed over values.

I'm not even thinking about how you would test that an event handler is called
etc ...

But in our case, the rendered stuff could always set something on the window or
something and then you use page.evaluate to fetch it for the test.

Playwright also has `beforeMount` and `afterMount` hooks that allow you to do
arbitrary stuff. It says that they reuse the page but reset things in between
tests so probably means they just reload the page. I guess we could do that as
well instead of having a teardown function?

Mixing frontend and server code just seems so sketchy though. There's always
these caveats like: oh but you can't actually do this or you can't actually do
that even though you can write the code just fine. The main benefit for us is
type safety on the args that you can pass to the component. And we could probably
use typescript types to ensure that these args are serializable somehow maybe.

The simplest way to do it without any crazy compiler stuff would be:

```
useDisplay<MyArgs>("./pathToFileForBrowser.ts", "myCoolDisplayExport")
```

Here you would have to specify the type explicitly as well as the export name
and the path.

Maybe we could do:

```
useDisplay("myCoolDisplayExport", () => import("./pathToFileForBrowser.ts"))
```

So we were able to do the above. And we get type safety for the args. And we put
the stuff that should run in the browser in its own file, so presumably you could
put whatever you want in there since it will not load that during the test, I think,
since it's a dynamic import.

Indeed, to make this work, we could try two approaches:

1. Change the server side to replace useDisplay with another function and convert the
import thunk to just a string path parameter. Then the other function takes this
and the export name and sends it to the browser to have it load that.
2. Change the browser side import so that when it imports the behavior file with some
query param like "?loadDisplay=myCoolDisplayExport" then it parses the bundled file and
finds the call to usedisplay and figures out the path and then just returns the contents
of that file.
3. We could just make use display take the text of the import thunk (ie toString) and
parse out the path and then construct the url from that because it should know the current
behavior path from the useContext() call. Then it could just do (1) but without any
compiler hijinks. The only restriction would be that the thunk must contain a string of
the form `import("some-relative-path")` that we could parse out. Is that a safe assumption?

You could do other stuff, but if you want the type safety then you must put some definite
path that can get parsed by typescript/vscode. Otherwise you'll be `unknown` for the type
arguments which will allow you to do anything.

### Allowing prepared browser pages to be reset

I don't think we ever want to open multiple windows, like one for each example
one after the other. But we /might/ want to destroy and recreate the current
window. Why? because it's too difficult to teardown whatever we've added to
the window?

There's two options in general:

1. Reload the existing page and evaluate adapters and source map support
2. Close the existing page and open a new one and evaluate adapters and source map support

With browser behaviors and display behaviors we'd need separate ways to
trigger this.

A) For display behaviors there could be a function on the display to reset
B) For browser behaviors, we'd need to expose a function on the window that could
be called to actually destroy the window. 

Maybe for this we don't need to do anything. Hopefully one could teardown anything
and then this is just not necessary. You get one browser window and that's it.

### Building for test

We have a dependency among file locations. In order to load the adapters, we
need to know where to find them on disk. And after the build step they are in
a different location than before that.

We had solved this by passing in a root path to the run function that we could
change during the test. But if we want to expose the run function then we shouldn't
make people have to figure this out and pass it in.

So we could build with tsc before the tests and just reference files in the dist
dir. But tsc is slow.

We can build with esbuild which is very fast. But then the question is: do we have
a separate 'dist' folder for tests? that feels better than actually reusing the
dist folder that we will ship. But then we have to be able to build the adapters
in that folder as well ...

### Decorating the page

We have a case where a test needs to add an event handler to the Playwright Page
(to dismiss a dialog). But these are behaviors where we are using `useLocalBrowser`
and so it's utilizing a single page for all the examples. So two problems:

1. Every example is calling the code to add an event listener to dismiss a dialog.
But then that means the event listener is added a bunch of times and then it
fails because you can only dismiss a dialog once.

2. If we were to decorate the page somehow with the event handler only once, then that
event handler is still available during every other example because we don't reset the
page.

### Calling the Page from the browser

This use case about running arbitrary JS in the browser and then doing some stuff
in Node is really about the case where we want to use Playwright as an API for
making assertions about what is in the browser. So one way to allow this would be
to have the ability to call methods on the Page object from within the browser.
Something like:

```
withPage((page, selector) => {
  return page.locator(selector).innerText()
}, selector)
```

We know Playwright has an exposeBinding method and when you call it the node side
gets a reference to the page. But we would need to specify a function to call
that presumably utilizes the page object.

Then withPage would be something like:

```
return window._withPage(scriptText, selector)
```

And the withPage on the server would have to evaluate the scriptText as a function
and then call it with the page and the selector?

### Identifying the view to load in the browser

In order to do `useView`, we need to be able to send some information to the browser
page that tells it what code to load so that it can render it. As part of this we
sometimes send some 'context' to the render function specifying some options to
render some view in a way that's specific for the particular example that's running.
What would be nice is that when we are writing the test file, we get type
hints about the parameters involved in this 'context'. So, the ide somehow needs
to know what the view we want to load is, and the browser needs to know what it is,
and the node side needs to be able to determine the information to send to the
browser so it can load the right thing.

We've tried a dynamic import which works, but we're using a janky method to get
the path to the file from the import itself. This works sometimes but not if you
pass in a variable and use that to construct the path of the file to load at
runtime.

We could do some kind of crazy vite plugin. But it seems like this might also have
problems with closed over variables. For example:

```
useView({
  controller: () => myController
})
```

So we would want useView to tell the browser to import /this/ file with a query
param of `?loadView` or something. Then the vite plugin would see that. It would
use esbuild to bundle the behavior file. Then it would use acorn to find the call to
`useView`. it would get the function at the controller and hoist it to the main
scope. Then it would export it. And then we would return a file that just contains
that export and nothing else I guess somehow via bundling magic.

One problem: there could be many calls to useView via some helper function that each
example uses, maybe by passing in the name of some controller. So how do we know
/which/ example to focus on?

Note that the render function is just a function that we could definitely
execute in the browser -- it should be executed in the browser. So could we
just use that as the argument to Playwright evaluate? and the context is an object
we pass in? The problem is that it could reference imports that are not in the scope
of the browser. So, would it be possible to use esbuild to somehow bundle this
code at runtime and send it to the browser? I don't think it can bundle a string
that's given to it. It would need to work with a file entrypoint.

I guess I could run a plugin that analyzes the current code and tries to deal
with the closed over variables in the import statement. But then we still have the
import statement which isn't the best affordance I think.

One other possibility might be to say that the render function must contain
async imports for anything? So it could then just be evaluated in the browser? That's
way too restrictive though I think.

Note that when Qwik or whatever does this, they have client code that tags some
functions to run on the server. But it does so only because the client code gets called.
We have server code that needs to execute something on the client. And we will
execute this code so at the appropriate time we should call something on the client.

If we were to do this naively then we would just say tell me the path to a file and
the export and then I will call a function in the browser that tells it to load that
file and the particular export. That's what we do now in the view tests basically.

So how could we make that easier?

if we have:

```
useValue({
  controller: () => someController,
  html: "/path/to/index.html"
})
```

Then we would want to change this to:

```
sendUseValueToBrowser({
  thisFile: "/my/filename.ts",
  exportName: "export276",
  html: "/path/to/index.html"
})

export const export276 = () => {
  return someController
}
```

And then the browser loads /this page/ and asks for export 276. So we would need to
transform the server side and the client side versions of the code.

What if `useView` was in `./helpers/TestHelpers.ts`.
It could still get transformed in this way. But would surley need to capture the
scope somehow right? And it would have to pass that to the browser. So it would
have to be serializable.

Right now I split things up -- is that necessary?
`useView` specifies the view to load and then `view.mount` passes in the
context if necessary. Why not just have `view.mount`? and it just takes
a function that will run in the browser. And to start we could even do it
like the playwright function, where you pass the context explicitly. It could
contain asynchronous imports for some page.

Or I mean we could stick with the split we have now and useView just takes
a function that knows how to load the view controller in the browser:

```
useView((context) => {
  return import(`./my-${context.name}-view.ts`)
}, { name: "fun" })
```

that would totally work. AND if we specified the names it would return the
correct types I think.

In the simplest case, with a default export it could be:

```
useView(() => import("./my-fun-display.ts"))
```

Why not just do that? We could even say that the display file should just have one
default export.

And what about specifying the HTML?

```
function getIt(displayName: string) {
  return useView({
    controller: (name) => import(`./my-${name}-display.ts`, displayName),
    html: "/path/to/index.html"
  })
}
```

Note that I don't think I can do this because (1) vite is transforming
the dynamic import and replacing the relative path, so if we convert it to
a string it doesn't even say `import` anymore.

Note that I can get a JSHandle from `evaluateHandle`. So theoretically I could
evaluateHandle something that loads the context and then returns a handle to it,
which I could then pass in another evaluate function? It could even be that
useValue itself executes evaluateHandle to get the handle and then passes it
later during the mount call.

But nevertheless we have the problem that we can't even get the code that does
the import since vite transforms it.

So it seems that I *can* use a module loading function that I just send to the
browser to execute. I get a JSHandle back which I can then pass to another function
to actually use the context. It's kind of nice maybe because then I can track the
ViewController on the node side with the JSHandle reference rather than needing
to set some property on the window object.

So maybe the api should be like:

```
useView({
  controller: useModule((context) => import(`./blah-${context.name}.ts`), { name: "fun" }),
  html: "blah.html"
})
```

Should I allow specifying an export name? Or should I just say you have to use
the default export? Maybe default is simpler.

Or maybe:

```
useView((context) => import(`./blah-${context.name}.ts`), { name: "fun" }, {
  html: "blah.html"
})
```

The above is not great because sometimes there's no context, but then also
sometimes there's no HTML option and you can't have two optional arguments.

Or

```
useView((context) => import(`./blah-${context.name}.ts`), { name: "fun" })
  .withHtml("blah.html")
```

Not good because we need to know the HTML when we create the view page, unless
we move that to the mount function.

Or maybe we could have some function like:

```
useBrowser(() => import("./blah.ts"))
```

which just executes something in the relevant browser page and returns the result?
problem is that we need to use `evaluateHandle` here and then our `useView` function
would expect a `Promise<JSHandle>` which wouldn't help us with type safety.

The most straightforward would be:

```
useView({
  module: (context) => import(`./${context.name}.ts`),
  moduleLoaderArgs: { name: "fun" },
  html: "./blah.html"
})
```

I wonder if I could actually combine this with `useLocalBrowser`? Like:

```
useBrowser({
  view: useModule((context) => import(`./blah-${context.name}.ts`), { name: "fun" }),
  html: "./blah.html"
})
```

or just:

```
useBrowser({
  html: "./blah.html"
})
```

But then the resulting object would have to have a `mount` function, but this would
only make sense if you had defined a viewController. Nevertheless, we could change
`useLocalBrowser` to the above where you specify an html page to appear in the page
rather than using `localLocalPage` or whatever.

So probably still make sesne to have `useView` and it would be nicest to do
something like:

```
useView((context) => import(`./blah-${context.name}.ts`), { name: "fun" })
```

But then how do you specify HTML to load? We could have:

```
view.loadLocal("./blah.html")
```

And then if you do mount, then it would load within whatever page is currently
in the browser. Or why not just do:

```
const browser = await useBrowser()
await browser.loadLocal("./blah.html")
const view = browser.setViewController(() => import("./my-view.ts"))
view.mount({ name: "brian" })
```

Or maybe `useView` just operates on the current browser, whatever that is?

```
const view = useView(() => import("./my-view.ts"))
```

Note that currently we don't actually load the controller into the browser until
`mount` is called. 

We could do something like this:

```
const viewControllerHandle = controller(() => import("./display.ts"))
const browser = await useBrowser()
await browser.loadLocal("./index.html")
await browser.mountView({
  controller: viewControllerHandle,
  renderArgs: { name: "fun" }
})
const text = await browser.page.locator("h1").innerText()
```

All we really need is the separate viewController that we could reuse in
lots of different examples with different render args. Maybe that would simplify
the api a bit.

We could actually get rid of `loadLocal` and just use `browser.page.goto`
if we set the baseUrl in the browser context.

```
const viewControllerHandle = controller(() => import("./display.ts"))
const browser = await useBrowser()
await browser.page.goto("./index.html")
await browser.mountView({
  controller: viewControllerHandle,
  renderArgs: { name: "fun" }
})
const text = await browser.page.locator("h1").innerText()
```

Note that I think I might have to require a string literal when importing
a view controller module. It may just be too tough to deal with all the cases
of handling variables in the import. Also if you do this you lose type safety
which is something that we want ...

### Configuring Playwright

We want to be able to configure playwright browsers in a few ways
- determine which browser type to launch
- pass args and other params to the `launch` method
- potentially using `connect` method to use browsers that are remote
like with browserstack

We also want to be able to parallelize behavior runs. And so whatever way
we configure the browser needs to be compatible with that.

Note that Playwright test lets you define several different browsers to work
with and then runs the tests in parallel across them. Browserstack has that
capability but I think the way they want you to do things is just to connect
to one browser at a time through the `connect` method.

So there's probably two senses of 'parallel' here ... (1) split a test suite
into parts and runs these parts across some set of workers. (2) Run the entire
test suite multiple times under different conditions -- like browser type.

The problem too is that must of the ways to start things up return a Browser
object, with the exception of `launchPersistentContext` which just returns a
BrowserContext. All we care about is the BrowserContext though ...

Note that BrowserContexts are completely isolated. So not sure why it is that
Playwright test starts a completely separate Browser for each parallel worker.
It may be because if the Browser is one process you are reliant upon it to do
stuff in parallel in multiple contexts and it's not clear if it spreads that
our across multiple cores or whatever. So probably better to start multiple
browsers if we have multiple workers.

We could make it so that what you really need to provide is a websocket url.
And then by default we use `launchServer` from the main process (maybe with
each in its own process?). And we get the url and then `useBrowser` or whatever
connects to it as necessary. And then if we are parallel, we just call launchServer
several times? and pass each worker a websocket url? And if we need to connect
to browserstack we just provide the websocket url. So the `run` function would
just take a websocket url for playwright ... This doesn't solve the need
to use the `launchPersistentContext` option however ...

The other way to think about this is that maybe best-behavior is not meant
to be everyting ... it's not meant to replace playwright-test, for example. It's
not even really meant to be an end-to-end testing tool. And so if you have to
do crazy things to the browser then maybe you should use another tool?

There's also just a ton of ways to configure playwright ... including on the
BrowserContext which we aren't even considering. That's potentially way more
useful. That could be passed in as part of `useBrowser` but then we'd probably
also want to create a brand new context every time you call `useBrowser` then
as the params could be specific to an example.

I wonder if we could pass *all* the options via `useBrowser` -- some for the
browser and some for the context. Then, it could potentially change on an
example by example basis. But we would not want to create a new browser for
each example ... so feels like doing browser config per example is too much
although it would be convenient. It could be that you specify a browser name
when using a browser and this name has some config associated with it. That way
we just keep a set of browsers based on the name. or we have a discriminated
union that's like:

```
useBrowser({ browser: myBrowser, context: { ... } })
```

where

```
const myBrowser = {
  type: "local",
  name: "chromium",
  args: ...
}
```

or 

```
const myBrowser = {
  type: "remote",
  wsEndpoint: ...
}
```

But what about the persistent browser context? Or what if `useBrowser` just
*took* a playwright Browser object and/or it just took a BrowserContext that
the test writer configures somehow? So your example would do:

```
useBrowser({
  browser: (isHeadless) => someBrowser(isHeadless),
  context: (params) => browser.newContext()
})
```

where `someBrowser` is created by `launch` or `connect` or whatever and this
is passed into the context function where the context could be configured.
We might need to have a function for the browser property so it's easy to
set whether the browser is visible. Both of these would be optional
parameters. The context function params argument would contain things like
`browser` -- a reference to the browser object -- and `baseUrl` -- the
host of the vite server. Not sure if there would be other options or not
that would be necessary (so maybe could just have two arguments?)

this is nice because then even if we do run the example in a separate process,
tehse would be modules that would get loaded in that process like any other
regular import because they are part of the text itself.

This seems like it would work great for `useBrowser` -- but it doesn't allow
us to configure the browser context for behaviors that are run in the browser ...

We also don't allow for any other config of the page for browser behaviors
(like loading stylesheets etc). And if we had a config file or something we could
load that ... but it would be confusing that sometimes you configure a browser
one way and other times you configure the browser in a different way ...

I think actually what we need is to configure the browser *once* and then allow
configuring a context for each example (via `useBrowser`). What we need is a
config file that's javascript that gets imported to set the variables for the run
function -- and so could be imported by multiple processes if necessary. As
part of this config file you can specify a function to create a browser, so it
can be done lazily. And we could do the same thing with the browser context for
browser behaviors and even html to load.

So a few things we need to do:
- Make it so that each time you use `useBrowser` it creates a new BrowserContext
- Make it so that you can pass a function to provide a BrowserContext in
`useBrowser` -- this function gets the current browser and the vite host url.
- Look for and import a config file -- you can specify a path via the cli if
necessary. And allow specifying a function to produce a Browser in this file.
- Allow specifying a function to produce a default BrowserContext. This would be
used for BrowserBehaviors and as a default for `useBrowser`

What about `loadPersistentContext` -- is there a way we could use that? I guess
you could still do that within the function that generates a BrowserContext.
The runtime would not care if you use the passed in browser to generate it or
not I guess.

### config file parsing

Looks like cosmicconfig is the main thing that to deal with stuff like this,
but there's an alternative called `lilconfig` that has no dependencies. Since
we want to only deal with JS/TS then lilconfig makes more sense because it
doesn't build in support for yaml etc. 

Then we would need to write a loader for typescript. We can use this thing
called `jiti` to parse typescript. We can just write it ourselves I think
rather than using another package. See the code here:

https://github.com/Codex-/cosmiconfig-typescript-loader/blob/main/lib/loader.ts

And we just want to support: `.js`, `.cjs`, `.mjs`, `.ts`, `.mts`, `.cts` (not
sure if the last two are real things or not)

