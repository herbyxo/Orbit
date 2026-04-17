import { callLLM, humanizeLLMError } from '@/lib/llmProviders'

// Orbit is BYO-key: the user's own API key arrives in the request body,
// gets forwarded to the provider SDK, and is never logged or persisted.
// This route is stateless.

const SMALL_REPO_THRESHOLD = 100
const MAX_CONTENT_CHARS_PER_FILE = 4000
const AUTO_SUMMARY_CONTENT_CHARS = 2000

export const maxDuration = 30

export async function POST(req) {
  try {
    const body = await req.json()
    const { messages, graphContext, provider, model, apiKey, isAutoSummary } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: 'messages must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!provider || !model || !apiKey) {
      return Response.json(
        { error: 'provider, model, and apiKey are required' },
        { status: 400 }
      )
    }

    const system = isAutoSummary
      ? buildAutoSummaryPrompt(graphContext)
      : buildSystemPrompt(graphContext)

    const { text, usage } = await callLLM({
      provider,
      model,
      apiKey,
      system,
      messages,
    })

    return Response.json({ text, usage })
  } catch (err) {
    // Log the provider + model but never the key.
    console.error('[api/chat] error:', humanizeLLMError(err))
    return Response.json(
      { error: humanizeLLMError(err) },
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
- If the codebase doesn't contain what the user is asking about, say so - don't invent files.
- Keep answers tight. The developer wants insight, not an essay.
- When tracing data flow or dependencies, walk through it step by step and highlight each file in the chain.`
}

function buildAutoSummaryPrompt(graphContext) {
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
      base.content = n.data.content.slice(0, AUTO_SUMMARY_CONTENT_CHARS)
    }
    return base
  })

  return `You are reviewing a codebase for the first time. Give the developer a fast orientation in 3–5 sentences covering: what this project does, the main entry point(s), and the 2–4 major functional areas with the files that own them.

Codebase (${nodes.length} files, ${edges.length} connections):
${JSON.stringify(structure, null, 2)}

Rules:
- Be specific. Use exact file paths.
- After mentioning a key file, emit [[highlight:exact/path.js]] so it glows in the graph.
- Plain prose only — no bullet points, no headers.
- Stay under 5 sentences. Fast orientation, not an essay.`
}
