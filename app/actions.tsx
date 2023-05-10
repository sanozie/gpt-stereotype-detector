'use server'

import prisma from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { type Stereotype } from '@prisma/client'
import { ratelimit } from '@/lib/utils'
import { type StereotypeVector } from '@/types/stereotypes'

export async function searchStereotypes(
  query: string
): Promise<Array<Stereotype & { similarity: number }>> {
  try {
    if (query.trim().length === 0) return []

    const { success } = await ratelimit.limit('generations')
    if (!success) throw new Error('Rate limit exceeded')

    const embedding = await generateEmbedding(query)
    const vectorQuery = `[${embedding.join(',')}]`
    const stereotype = await prisma.$queryRaw`
      SELECT
        id,
        "text",
        1 - (embedding <=> ${vectorQuery}::vector) as similarity
      FROM stereotype
      where 1 - (embedding <=> ${vectorQuery}::vector) > .5
      ORDER BY  similarity DESC
      LIMIT 8;
    `

    return stereotype as Array<Stereotype & { similarity: number }>
  } catch (error) {
    console.error(error)
    throw error
  }
}

async function generateEmbedding(raw: string) {
  // OpenAI recommends replacing newlines with spaces for best results
  const input = raw.replace(/\n/g, ' ')
  const embeddingResponse = await openai.createEmbedding({
    model: 'text-embedding-ada-002',
    input,
  })

  const embeddingData = await embeddingResponse.json()
  const [{ embedding }] = (embeddingData as any).data
  return embedding
}

async function generateGPTProfile(stereotypes: StereotypeVector[]) {
  // Average all the scores in this reducer
  const reducer = {
    friendly: 0,
    trustworthy: 0,
    confident: 0,
    competent: 0,
    wealthy: 0,
    conservative: 0,
    religious: 0
  }

  let column: keyof typeof reducer
  for (let stereotype of stereotypes) {
    for (column in reducer) {
      reducer[column] = reducer[column] + parseInt(stereotype[column])
    }
  }

  for (column in reducer) {
    reducer[column] = reducer[column] / stereotypes.length
  }

  // Here, should try and see how far off each of the scores are from the average for all the scores

  const prompt = `You are a thingy that does thingy`
  const davinciResponse = await openai.createCompletion({
    model: "text-davinci-003",
    prompt,
    temperature: 0,
    max_tokens: 7,
  })
}