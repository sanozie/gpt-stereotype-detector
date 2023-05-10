'use server'

import prisma from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { type Stereotype } from '@prisma/client'
import { ratelimit, reduceStereotypes } from '@/lib/utils'
import { type Reducer, type StereotypeSearch } from '@/types/stereotypes'
import stereotypeAverages from '@/prisma/stereotype-averages.json'
import { maxSimilarityThreshold, similarityThreshold } from '@/data/thresholds'
const averages: Reducer = stereotypeAverages

export async function searchStereotypes(
  query: string
): Promise<Array<StereotypeSearch>> {
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
        "friendly",
        "trustworthy",
        "confident",
        "competent",
        "wealthy",
        "conservative",
        "religious",
        1 - (embedding <=> ${vectorQuery}::vector) as similarity
      FROM stereotype
      where 1 - (embedding <=> ${vectorQuery}::vector) > ${similarityThreshold}
      ORDER BY similarity DESC
      LIMIT 100;
    `

    return stereotype as Array<StereotypeSearch>
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

export async function generateGPTResponse(stereotypes: StereotypeSearch[]): Promise<string> {
  const modifier = (row: StereotypeSearch, column: keyof Reducer) =>
      (parseInt(row[column]) - averages[column])
      * ((row.similarity - similarityThreshold) / (maxSimilarityThreshold - similarityThreshold))
      / stereotypes.length

  const reducer = reduceStereotypes(averages, stereotypes, modifier)

  let key: keyof Reducer
  for (key in reducer) {
    reducer[key] = Number((((reducer[key] - averages[key]) / 0.5) * 100).toFixed(2))
  }

  console.log(reducer)

  const systemPrompt =
      `You are a computer that wants to accurately mimic a human in the following categories: friendliness, trustworthiness, confidence, competence, wealthiness, and religiousness.
      Each of these categories are measured on a scale of negative 100 percent to positive 100 percent.
      A negative percentage means that you exhibit the opposite of that trait, while a positive percentage means you positively exhibit that trait.
      A percentage closer to either 100 or negative 100 means that you extremely exhibit that trait, while a percentage close to 0 means you mildly exhibit that trait.
      Create a persona of somebody who has these traits. Describe that persona in 50 words or less. Do not give the persona a name or gendered pronouns.`

  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    top_p: 1,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `
      Friendliness: ${reducer.friendly}%
      Trustworthiness: ${reducer.trustworthy}%
      Confidence: ${reducer.competent}%
      Competence: ${reducer.competent}%
      Wealthiness: ${reducer.wealthy}%
      Religiousness. ${reducer.religious}%
      `,
      }
    ]
  })

  let data = await response.json()
  return data.choices[0].message.content
}