// Imports don't use TS alias because it runs as standalone module in node
import prisma from '../lib/prisma'
import * as fs from "fs"
import * as path from "path"
import { parse } from 'csv-parse'
import { openai } from '../lib/openai'
import * as dotenv from 'dotenv'
import stereotypes from './stereotypes.json'
import { type Stereotype } from '@/types/stereotypes'
import { reduceStereotypes } from '../lib/utils'

dotenv.config() // Load the environment variables

if (!process.env.OPENAI_API_KEY) {
  throw new Error('process.env.OPENAI_API_KEY is not defined. Please set it.')
}

if (!process.env.POSTGRES_URL) {
  throw new Error('process.env.POSTGRES_URL is not defined. Please set it.')
}

async function main() {
  try {
    const activist = await prisma.stereotype.findFirst({
      where: {
        text: 'activist',
      },
    })
    if (activist) {
      console.log('Stereotypes already seeded!')
      return
    }
  } catch (error) {
    console.error('Error checking if "activist" exists in the database.')
    throw error
  }

  // Converts Stereotype CSV to JSON. Uncomment if you need to re-generate stereotypes.json file.
  await generateJSON()

  let currentText = null, currentEmbedding = null
  for (const record of (stereotypes as any) as Stereotype[]) {
    let embedding = null
    if (currentText !== record.text) {
      currentText = record.text
      embedding = await generateEmbedding(record.text)
      currentEmbedding = embedding
      // Wait 500ms between requests;
      await new Promise((r) => setTimeout(r, 500))
    } else {
      embedding = currentEmbedding
    }

    // Create the stereotype in the database
    const stereotype = await prisma.stereotype.create({
      data: record,
    })

    // Add the embedding
    await prisma.$executeRaw`
        UPDATE stereotype
        SET embedding = ${embedding}::vector
        WHERE id = ${stereotype.id}
    `

    console.log(`Added ${stereotype.id} ${stereotype.text}`)
  }

  // Uncomment the following lines if you want to generate the JSON file
  // fs.writeFileSync(
  //   path.join(__dirname, "./stereotypes-with-embeddings.json"),
  //   JSON.stringify({ data }, null, 2),
  // );
  console.log('Stereotypes seeded successfully!')
}
// main()
//   .then(async () => {
//     await prisma.$disconnect()
//   })
//   .catch(async (e) => {
//     console.error(e)
//     await prisma.$disconnect()
//     process.exit(1)
//   })

async function generateEmbedding(_input: string) {
  const input = _input.replace(/\n/g, ' ')
  const embeddingResponse = await openai.createEmbedding({
    model: 'text-embedding-ada-002',
    input,
  })

  const embeddingData = await embeddingResponse.json()
  console.log(embeddingData)
  const [{ embedding }] = (embeddingData as any).data
  return embedding
}

async function generateJSON() {
  console.log("generate JSON")
  const csvFilePath = path.resolve(__dirname, '../data/Stereotypes.csv')
  const csvColumnCount = 210 // Ideally should be dynamically generated, but alright for now
  const csvHeaderIndexes: Record<number, string> = {
    1: "text",
    5: "gender",
    6: "age",
    7: "race",
    8: "politics",
    14: "friendly",
    15: "trustworthy",
    16: "confident",
    17: "competent",
    18: "wealthy",
    19: "conservative",
    20: "religious"
  }

  // Creates an array that filters headers in CSV parsing function by nulling out unneeded headers
  const headers = Array(csvColumnCount).fill(null)
      .map((val, i) => csvHeaderIndexes[i] ? csvHeaderIndexes[i] : null)

  const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' })

  parse(fileContent, {
    delimiter: ',',
    columns: headers,
    from: 2
  }, (error, result: Stereotype[]) => {
    if (error) {
      console.error(error)
    }

    // Writing data to JSON file
    const data = JSON.stringify(result)
    const dataPath = "./prisma/stereotypes.json"
    fs.writeFile(dataPath, data, (error) => {
      // throwing the error
      // in case of a writing problem
      if (error) {
        // logging the error
        console.error(error);
        throw error;
      }

      console.log(`⛭ stereotypes.json generated, saved to ${dataPath}`)
    });
  })
}

// Bug running this, process does not terminate
async function generateAverages() {
  const table = await prisma.stereotype.findMany()
  const averages = reduceStereotypes(table)
  fs.writeFileSync(
    path.join(__dirname, "./stereotype-averages.json"),
    JSON.stringify(averages, null, 2),
  );
}
generateAverages()
    .then(async () => { await prisma.$disconnect() })
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })

