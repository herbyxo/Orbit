import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 1000

const SMALL_REPO_THRESHOLD = 100
const MAX_CONTENT_CHARS_PER_FILE = 4000

export const maxDuration = 30

export async function POST(req) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    const { messages, graphContext } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: 'messages must be a non-empty array' },
        { status: 400 }
      )
    }

    const system = buildSystemPrompt(graphContext)

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')

    return Response.json({ text, usage: response.usage })
  } catch (err) {
    console.error('[api/chat] error:', err)
    return Response.json(
      { error: err?.message ?? 'internal error' },
      { status: 500 }
    )
  }
}

function buildSystemPrompt(graphContext) {
  if (!graphContext || !Array.isArray(graphContext.nodes)) {
    return 'You are an AI assistant for a developer. No codebase context was provided.'
  }

  const { nodes, edges = [] } = graphContext
  const isSmall = nodes.length <= SMALL_REPO_THRESHOLD

  const structure = nodes.map((n) => {
    const base = {
      path: n.data?.fullPath ?? n.id,
      type: n.data?.fileType ?? 'unknown',
      imports: n.data?.imports ?? [],
      importedBy: n.data?.importedBy ?? [],
    }
    if (isSmall && n.data?.content) {
      base.content = n.data.content.slice(0, MAX_CONTENT_CHARS_PER_FILE)
    }
    return base
  })

  return `You are an AI assistant embedded in Orbit, an interactive codebase visualiser. A developer is looking at a force-directed graph of their codebase and asking you questions about it.

You have access to the following codebase (${nodes.length} files, ${edges.length} import edges, mode: ${isSmall ? 'full content' : 'structure only'}):

${JSON.stringify(structure, null, 2)}

Guidelines:
- Be direct and specific. Reference exact file paths from the structure above.
- When you mention a specific file that's relevant, emit it in this exact format so the UI can highlight the corresponding node in the graph:
  [[highlight:exact/file/path.js]]
- Use the exact path from the structure. You can emit multiple highlights per response.
- If the codebase doesn't contain what the user is asking about, say so — don't invent files.
- Keep answers tight. The developer wants insight, not an essay.
- When tracing data flow or dependencies, walk through it step by step and highlight each file in the chain.`
}
