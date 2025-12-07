<title>The case for AI Transpilation</title>

# The case for AI Transpilation

<time datetime="2025-12-01">01 Dec 2025</time>

I've been thinking about an intermediate representation for AI workflows which I have briefly talked about [here](/roast#workflows-as-output). The premise being a better performing LLM model can generate a set of instructions that a cheaper and more specialized set of models can execute on. We have seen this in prompt engineering where an LLM expands a vague and short prompt into a more detailed one to get better results from another model. But I think this can be taken further by introducing structure into the output.

I've been exploring this idea with [Roast](https://github.com/Shopify/roast), but this would work with any AI model harness. Some of the ideas that I really like and would serve well as a basis for an intermediate representation are:

- swapping amongst different models for different steps in the task, with context persisted across steps
- accessing model output from previous steps
- control flow
- and code execution.

This generated output can be persisted, checked in and shared. A repository of such outputs can serve as a valuable resource for collaboration and reuse. This usually comes in the form of recipes and starter kits; instead of vibe coding from scratch, this can serve as a well tested foundation for new projects. No access to the state of the art coding agents? Use this recipe that someone else shared. This also opens up the possibility of versioning AI workflows, allowing teams to track changes and revert to previous versions if needed.

It's possible that LLM providers are already outsourcing parts of their workflows to specialized models, but having explicit control over this process can lead to more predictable and optimized outcomes. You have more obvious knobs to turn after evals than to submit to the whims of prompt engineering.

Control flow and code execution can also serve to provide context engineering, for example if a step is skipped based on certain conditions, we can omit providing context from that step to subsequent steps. While code execution offers more precision than natural language to manipulate data and context.

I'm sure there are already products out there exploring this idea. So this is a case for a new standard workflow syntax, DSL and its accompanying language server, and a Claude Agent [Skill-esque](https://www.claude.com/blog/skills) solution to help models generate better workflows.
