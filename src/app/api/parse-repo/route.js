import { parseRepo } from '@/lib/parseRepo'

// Parsing a larger repo can take 10–20s. Raise Vercel timeout.
export const maxDuration = 30

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const { url } = body

    if (!url || typeof url !== 'string') {
      return Response.json(
        { error: '`url` is required (GitHub repo URL or owner/repo)' },
        { status: 400 }
      )
    }

    const result = await parseRepo(url)
    return Response.json(result)
  } catch (err) {
    console.error('[api/parse-repo] error:', err)
    const msg = err?.message ?? 'internal error'
    const isClientError =
      /not found|invalid|limit|no javascript|exceeds/i.test(msg)
    return Response.json({ error: msg }, { status: isClientError ? 400 : 500 })
  }
}
