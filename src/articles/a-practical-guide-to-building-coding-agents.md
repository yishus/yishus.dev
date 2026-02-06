<title>A Practical Guide to Building Coding Agents</title>

# A Practical Guide to Building Coding Agents

<time datetime="2026-02-07">07 Feb 2026</time>

_Hi to future readers, the models might have improved drastically to the point where strategies discussed here no longer apply. I might or might not update the content here, but I hope that you could still pick up some tips or intuition to working with a large language model. Have fun!_

I started building my own coding agent a month ago. I can't overstate how much fun the process has been, an endeavor to design model user experience in order to improve output quality. This post is the culmination of my research and learnings, to see said coding agent head over to [dim](https://github.com/yishus/dim).

## Table of Contents

- [Foundations](#foundations)
  - [Streaming](#streaming)
- [Tool use](#tool-use)
  - [Defensive requests handling](#defensive-requests-handling)
  - [Timeouts and tool output validation](#timeouts-and-tool-output-validation)
  - [Optional tools](#optional-tools)
  - [Subagent](#subagent)
  - [Agent loop](#agent-loop)
- [MCP](#mcp)
  - [Code mode](#code-mode)
- [Skills](#skills)
- [Prompts](#prompts)
  - [User prompts](#user-prompts)
- [Prompt caching](#prompt-caching)
  - [Implicit caching](#implicit-caching)
  - [Explicit caching](#explicit-caching)
- [Compaction](#compaction)
- [Memory](#memory)
- [Tasks](#tasks)
  - [Ralph Wiggum](#ralph-wiggum)
- [Multi-agent coordination](#multi-agent-coordination)
- [Quality of life improvements](#quality-of-life-improvements)
- [Other features](#other-features)

## Foundations

You begin by facilitating a conversation between a user and a large language model. requests that you make to the models are inherently stateless, you simulate a conversation by sending a history of back and forths and asking a model what they would reply when presented with such a situation.

```js
const message = await client.messages.create({
  messages: [
    {
      role: "user",
      content: "Add a dark mode toggle to this website"
    },
    {
      role: "assistant",
      content: "Let me check style.css to understand how the styles are structured"
    }
    {
      role: "assistant",
      content: "I understand now, I will now add a new class .dark"
    },
    {
      role: "user",
      content: "Add the same toggle to the about page"
    }
  ],
});
console.log(message.content) // What the model would say when presented with this chat history

```

You keep a conversation by appending to it when new content comes in and passing it back to the model through the provider's API. Some providers provide helper APIs or SDK functions that would persist this conversation, and you only need to pass new replies from the user.

```js
// Chat.tsx
export const Chat = () => {
  const [chatContent, setChatContent] = setState('')
  handleSubmit = () => {
    agent.prompt(chatContent)
  };
};

// agent.ts
class Agent {
  messages = []
  prompt(message) {
    const reply = await client.messages.create({
      messages: [
        ...messages,
        {
          role: "user",
          content: "message"
        }
      ]
    });
    messages.push(reply);
  }
}
```

A quick reader would realize that you could alter the history of this conversation for both what the user said and what the assistant has replied. Most coding agents remain faithful to what has transpired in the conversation (with the exception of [compaction](#compaction)) but you might have a use case to do otherwise.

And with this you now have an agent harness, a software to facilitate a conversation between the user and a model.

### Streaming

The models take noticeable time to respond and an improvement to make is to stream the replies. Often providers maintain an SSE message streaming API which is how you see messages rendered in sequence in AI chat apps. You will need a way to inform the client when a new chunk has come in, and to present that information on screen eg. EventEmitter on node, or a similar SSE approach for a client-server setup. Although take note that [tool](#tool-use) call requests will also be streamed if you take this option.

```js
const stream = await client.messages.create({
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello" }],
  stream: true,
});
for await (const messageStreamEvent of stream) {
  if (messageStreamEvent.type === "text") {
    this.eventEmitter.emit("message_update", { text: messageStreamEvent.text });
  }
}
```

## Tool use

Before this you had a chatbot but tool use is what makes this an agent, allowing the model to take actions. Recent strategies like [MCP](#mcp) and [Skills](#skills) are essentially extension to the basic tool use case. For a coding agent, a `read` and a `glob/grep` tool are good first tools.

```js
const readSchema = Type.Object({
  path: Type.String({
    description: "The absolute path to the file to read",
  }),
  offset: Type.Optional(
    Type.Number({
      description:
        "The line number to start reading from. Only provide if the file is too large to read at once",
    }),
  ),
  limit: Type.Optional(
    Type.Number({
      description:
        "The number of lines to read. Only provide if the file is too large to read at once.",
    }),
  ),
});

type argsType = Static<typeof readSchema>;

const definition = {
  name: "read",
  description:
    "Reads a file from the local filesystem. You can access any file directly by using this tool.",
  input_schema: readSchema,
};
```

You define a tool by giving it a name, description and an expected input schema. You could conditionally filter the list of tools in your message requests but that would not benefit from [cached tokens](#prompt-caching). In your program, define handler functions to process tool use requests from the model and respond with a result. Most models are able to request multiple tool use in a single message instead of sequential tool call requests, parallelizing the tool call functions can help improve performance.

### Defensive requests handling

Powerful tools such as `edit`, `write`, `bash` and `web-fetch` require your program to be defensive to the model's requests. Strategies to minimize risks from these tools include

- requiring user permission before executing the tool,
- creating a sandbox so that an agent can only affect files that are permitted,
- providing an approve list for web fetch,
- providing approved commands on the bash tool and
- using a 2-step fetch and summarize+risk assessment process in web fetch to process the web content before passing it back to the model.

### Timeouts and tool output validation

Basic sanitation will go a long way. Include timeout on all tool calls and validating tool outputs before passing the results back to the model helps to prevent further problems.

### Optional tools

And then you might have specific tools that your coding agent supports such as

- `lsp`
- `git`
- `web-search`
- `ask-user-question` (consolidate multiple back and forth conversation by showing a multi-question survey to the user) and
- `subagent` to delegate tasks to subagents with specific capabilities.

### Subagent

Subagents sound daunting but essentially a strategy to optimize context window size by creating parallel running agents to handle context heavy tasks before responding an answer to the main agent. Spawning a subagent is no different from how your main agent is initiated, keeping the agent and session entity separate allows multiple agents to be initialized by a single session. For autonomous subagent, see [multi-agent coordination](#multi-agent-coordination).

### Agent loop

In your harness you will add a loop that parses for tool call requests, respond with tool call result, parses the resulting response for more tool call requests and so on until the assistant respond with a final message. This is called the agent loop where a model will autonomously ingest new information and make requests to read and write to the system before it determines that it has completed its task.

## MCP

MCP is a protocol that allows 3 different type of content called primitives to group together in a single logical unit, namely resources (usually files for data), tools and prompts, accessible through an MCP server. Supporting MCP in your agent harness would entail allowing your user to connect to local and/or remote MCP servers, facilitate the fetching of prompts, resources and tool definitions and delegating tool use requests to the server.

### Code mode

Instead of providing a static list of tools in the context, in this concept often only a single meta tool is provided and code as the input argument. The code provided to the meta tool is executed and allows the model to query for tools and run multiple tool calls in a single tool use request. You could imagine this being conceptually similar to GraphQL in which only a single endpoint is provided but the request body of the API determines what actions to be taken on the server.

## Skills

Skills is an alternate way to package different type of content into a single logical unit. In skills the only requirement is a `SKILL.md` file similar to a prompt instructing a specific capability that the model should take on. For example a company branding `SKILL.md` file will include instruction on the branding guideline in markdown. More resources can be provided to the model in the form of further documentation in markdown files, executable code and static assets. The core concept is for progressive disclosure. When a skill is loaded only a simple metadata indicating a name and description of the skill is provided as part of the context. Only when a model requests for more data from a skill does that get appended to the context window, reducing context bloat by underused tools.

## Prompts

With prompts you write instructions to the models. Some examples:

- DO NOT ADD EMOJIS
- Do not reply "you're absolutely right!"
- Always reply in as little words as possible, conveying your intent within 4 sentences

Message requests accept a single system prompt and this prompt does not have to remain static although this will then invalidate [cached token](#prompt-caching). You can include environment variables in this prompt such as last 5 git commits, current directory path, OS versions etc to provide more context of your project to the model.

Plan mode can be implemented by creating separate plan and build prompts.

### User prompts

Beyond the system prompt, instruction to the model of lower priority can be provided as user prompts. This is added to the context as a message from the user, but usually contains xml tags to signal that it not an organic message from the user, instead a predefined prompt from the harness.

```js
const message = await client.messages.create({
  messages: [
    {
      role: "user",
      content:
        "<system-reminder>{context_from_long_term_memory}</system-reminder>",
    },
  ],
});
```

## Prompt caching

Depending on the providers, you might have access to implicit and/or explicit prompt caching.

### Implicit caching

In an implicit caching system, prompt optimization happens automatically. Once your prompt reaches a minimum size (usually 1024 tokens) the server begins hashing and storing the prefixes. Your prompt is then cached in prefix blocks.

[
"Lorem ipsum...", // Block 1 (Initial 1024)
"Lorem ipsum... at ex nulla", // Block 2 (+128 tokens)
"Lorem ipsum... at ex nulla... viverra massa" // Block 3 (+128 tokens)
]

In our use case of a multi-turn conversation:

| Request Prompt             | Cached Prefix Used  |
| -------------------------- | ------------------- |
| system + turns 1-21        | system + turns 1-20 |
| system + turn 1-15 + [NEW] | system + turns 1-15 |

Because caching is prefix-based, always put your static content (system prompt, static knowledge base) at the very top, and dynamic content (user query, current time) at the very bottom.

### Explicit caching

Caching for Claude requires explicit markers in the context to indicate where a breakpoint for caching should be placed. Cache is checked in a backward sequence from the markers, allowing the largest group of common blocks to surface as a cache hit. Similar to implicit caching, the cached result is a prefix of your prompt.

```js
const response = await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 1024,
  system=[
    {
      "type": "text",
      "text": "...long system prompt",
       "cache_control": {"type": "ephemeral"}
    }
  ],
  messages=[
    // ...long conversation so far
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Hello, can you tell me more about the solar system?",
        }
      ]
    },
    {
      "role": "assistant",
      "content": "Certainly!..."
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Good to know."
        },
        {
          "type": "text",
          "text": "Tell me more about Mars.",
          "cache_control": {"type": "ephemeral"}
        }
      ]
     }
  ]
});
```

Each marker has a 20-block lookback window, and will result in a miss if no match is found in the 20 blocks preceding a marker. As such the markers in reverse order serve as fallback in the case where a later marker does not yield a cache hit.

The cache follows the order of `tools` → `system` → `messages` and so in our multi-turn conversation coding agent, an approach is to add a `cache_control` marker to the system prompt and then one on the last content block of the conversation.

Gemini uses a resource based model for explicit caching.

```js
const contents = ...;
const response = await ai.caches.create({
  model: 'gemini-2.0-flash-001',
  config: {
   'contents': contents,
   'displayName': 'test cache',
   'systemInstruction': 'What is the sum of the two pdfs?',
   'ttl': '86400s',
 }
});
console.log(response.name) // cache id to append to generateContent requests
```

The use case is usually for a large file like a PDF or video content that you want to repeatedly reference in your requests.

## Compaction

It should be clear by now that your context window consists of

```log
+------------+ +------------+ +----------------------------------------------------------------------+
|Tool        | | System     | | Messages +----------++-----------+   +------------++------------+    |
|Definitions | | prompt     | |          |User      ||Assistant  |...|Tool request||Tool results|... |
|            | |            | |          +----------++-----------+   +------------++------------+    |
+------------+ +------------+ +----------------------------------------------------------------------+
```

Compaction is the strategy to optimize the context window. Although modern LLMs can handle large size context window and exhibiting needle in the haystack capabilities, trimming your context window can reduce context rot and help to focus the conversation to the crucial task on hand. Recall that a context window comprises of the system prompt and back and forth messages between the user and assistant model which can include tool call request and results.

Simple heuristic like removal of messages older than the most recent n messages or remove tool call request-result after n turns can already provide context compaction. More intrinsic approaches include summarization of context, clean context when the discussion topic has changed, discard messages from a meandering path (back and forth between user and assistant to determine the best approach, discard intermediate discussion)

## Memory

So far our conversation is held in memory as an array, if the user starts a clean state conversation or restarts our program, there is no recollection of what happened previously, persistence allows these hard earned progress to inform future conversations.

This doesn't have to get fancy, we can use a markdown file. `AGENTS.md` is common format across coding agents while Claude uses `CLAUDE.md`. Examples of information noted in this file includes:

- Project structure
- Dev environment commands
- Testing instruction
- Technology stack
- Major features

Loading this file as a system reminder as the first user message allows caching to happen while indicating that it is of lower priority than the system prompt.

## Tasks

Long running tasks can benefit from leveraging memory to persist task states. Similarly this can be a single markdown file or multiple JSON files. Jot down a name for each subtask, a brief description and if it has a dependency on another subtask. When resuming a task, read and add the tasks into the context and have the assistant resume on the tasks.

### Ralph Wiggum

```bash
while true; do
  agent run "$PROMPT"
done
```

A ralph-loop is an approach that repeatedly makes single query requests to a coding agent and leverages memory and/or repository state to inform the agent to take the next step without requiring human intervention.

You can achieve something similar with the combination of memory, task list, generated user prompts and halting conditions.

## Multi-agent coordination

In this approach you allow subagents to talk to each other. Instead of using the main agent as a orchestrator that has each subagent's output included in its context window, in this approach the main agent is a coordinator spawn the subagents but do not interfere with the process and offload all work. The harness maintains a cross agent communication tool that optionally sends message to and/or interrupts a subagent.

## Quality of life improvements

- Diff preview: When requesting for the edit or write tool, use a diff visualization tool to help user understand the requested changes.
- Highlights: Parse assistant responses for code and render with syntax highlighting.
- Loading indicators: Use an animated loading indicator to inform users when a request has been made but have yet to receive a response.
- Interrupt: Allow users interrupts to cancel a request or stop an agent loop.
- File reference: @ reference files in prompts with fuzzy file search
- Logs
- Token and cost warning: UI enhancement to help users keep track of their expenditure
- Message queueing: Allow users to write their next message while the current message is still ongoing

## Other features

- Slash commands: Allow users to invoke saved prompts, skills and other commands
- Session persistence: Allow users to resume a previous session
- Hooks: Allow users to define custom hooks that gets called when certain conditions are met
- Branching: Support forking of history in a session to allow users to experiment different prompts on a common state.
- Vector search
- Extensions/plugins
