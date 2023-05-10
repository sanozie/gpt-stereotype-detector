'use server'

import prisma from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { type Stereotype } from '@prisma/client'
import { ratelimit, reduceStereotypes } from '@/lib/utils'
import { type StereotypeSearch } from '@/types/stereotypes'
import averages from '@/prisma/stereotype-averages.json'

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
        "friendly",
        "trustworthy",
        "confident",
        "competent",
        "wealthy",
        "conservative",
        "religious",
        1 - (embedding <=> ${vectorQuery}::vector) as similarity
      FROM stereotype
      where 1 - (embedding <=> ${vectorQuery}::vector) > .5
      ORDER BY similarity DESC
      LIMIT 10;
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

export async function generateGPTResponse(stereotypes: StereotypeSearch[]): Promise<string> {
  // Average all the scores in this reducer
  const reducer = reduceStereotypes(stereotypes)

  let key: keyof typeof reducer
  for (key in reducer) {
    reducer[key] = Number((((reducer[key] - averages[key]) / 2) * 100).toFixed(2))
  }

  console.log(reducer)

  const prompt =
      `You are a computer that wants to accurately mimic a human in the following categories: friendliness, trustworthiness, confidence, competence, wealthiness, and religiousness.
      Each of these categories are measured on a scale of negative 100 percent to positive 100 percent.
      A negative percentage means that you exhibit the opposite of that trait, while a positive percentage means you positively exhibit that trait.
      A percentage closer to either 100 or negative 100 means that you extremely exhibit that trait, while a percentage close to 0 means you mildly exhibit that trait.
      Here are the percentages:
      Friendliness: ${reducer.friendly}%
      Trustworthiness: ${reducer.trustworthy}%
      Competence: ${reducer.competent}%
      Wealthiness: ${reducer.wealthy}%
      Religiousness. ${reducer.religious}%
      
      Use the percentages to introduce yourself as someone with these traits in 50 words or less.`
  console.log(prompt)
  // const davinciResponse = await openai.createCompletion({
  //   model: "text-davinci-003",
  //   prompt,
  //   temperature: 0.7,
  //   max_tokens: 1000,
  // })

  // console.log(davinciResponse.data.choices[0].text)

  return "davinciResponse"
}