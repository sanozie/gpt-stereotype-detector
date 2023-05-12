'use client'

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandGroup,
    CommandLoading
} from '@/components/command'
import { type Stereotype } from '@prisma/client'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { type StereotypeVector, type StereotypeSearch, Reducer } from '@/types/stereotypes'
import { BarLoader } from 'react-spinners'
import * as React from 'react'
import { reduceStereotypes } from '@/lib/utils'


export interface SearchProps {
  searchStereotypes: (
    content: string
  ) => Promise<Array<StereotypeSearch>>
  generateGPTResponse: (
      stereotypes: StereotypeSearch[]
  ) => Promise<string>
}

export type DisplayData = Reducer & { similarity: number | undefined, count: number }
type DisplayResults = Record<string, DisplayData>

export function Search({ searchStereotypes, generateGPTResponse }: SearchProps) {
  const [queryText, setQueryText] = useState('')
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<StereotypeSearch[]>([])
  const [displayResults, setDisplayResults] = useState<DisplayResults>({})
  const [gptResults, setGptResults] = useState('')
  const [searching, setSearching] = useState(false)
  const [writing, setWriting] = useState(false)

  // Run searchStereotypes function and update searchResults hook
  useEffect(() => {
      let current = true
      if (query.trim().length > 0) {
        setSearching(true)
        setDisplayResults({})
        setGptResults('')

        searchStereotypes(query).then((results) => {
          if (current && results.length > 0) {
            setSearching(false)
            setSearchResults(results)

            // Make a better way to do this, maybe by making types between reducer properties and stereotype search properties consistent, or filtering out the result var
            const uniques: DisplayResults = {}
            for (let result of results) {
              if (uniques[result.text]) {
                const { competent, confident, friendly, conservative, religious, trustworthy, wealthy } = uniques[result.text]
                uniques[result.text] = { ...reduceStereotypes({
                    competent,
                    confident,
                    friendly,
                    conservative,
                    religious,
                    trustworthy,
                    wealthy
                  }, [result], (row, col) => parseInt(row[col])), count: uniques[result.text].count + 1, similarity: result.similarity }
              } else {
                uniques[result.text] = {
                  competent: parseInt(result.competent),
                  confident: parseInt(result.confident),
                  friendly: parseInt(result.friendly),
                  conservative: parseInt(result.conservative),
                  religious: parseInt(result.religious),
                  trustworthy: parseInt(result.trustworthy),
                  wealthy: parseInt(result.wealthy),
                  count: 1,
                  similarity: result.similarity
                }
              }

              for (let text in uniques) {
                uniques[text].conservative = uniques[text].conservative / uniques[text].count
                uniques[text].friendly = uniques[text].friendly / uniques[text].count
                uniques[text].competent = uniques[text].competent / uniques[text].count
                uniques[text].religious = uniques[text].religious / uniques[text].count
                uniques[text].confident = uniques[text].confident / uniques[text].count
                uniques[text].trustworthy = uniques[text].trustworthy / uniques[text].count
                uniques[text].wealthy = uniques[text].wealthy / uniques[text].count

              }
            }
            setDisplayResults(uniques)
          }
        })
      }

    return () => {
      current = false
    }
  }, [query, searchStereotypes])


  useEffect(() => {
    if (searchResults.length > 0) {
      setWriting(true)
      generateGPTResponse(searchResults).then(res => {
        setWriting(false)
        setGptResults(res)
      })
    }
  }, [searchResults, generateGPTResponse])

  return (
    <div className="w-full">
      <Command label="Command Menu" shouldFilter={false} className="h-auto">
        <div className="relative">
          <CommandInput
              id="search"
              placeholder="Use as little or as much detail as you'd like."
              className="focus:ring-0 sm:text-sm text-base focus:border-0 border-0 active:ring-0 active:border-0 ring-0 outline-0 overflow-x-scroll"
              value={queryText}
              onValueChange={(q) => setQueryText(q)}
              disabled={writing}
          />
          <div
              className="bg-black h-full w-[10%] absolute right-0 top-0 flex justify-center items-center cursor-pointer"
              onClick={() => setQuery(queryText)}>
            <label>
              <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={24}
                  height={24}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 shrink-0 pointer-events-none"
              >
                <circle cx={11} cy={11} r={8} />
                <line x1={21} x2="16.65" y1={21} y2="16.65" />
              </svg>
            </label>
          </div>
        </div>
        {/*<CommandGroup heading="Stereotype Scores">*/}
        {/*  <CommandList className={"w-full"}>*/}
        {/*        <CommandItem*/}
        {/*            className="flex items-center justify-between py-3 px-10"*/}
        {/*        >*/}
        {/*          <div className="text-xs font-mono px-3 py-1 rounded bg-red-500 bg-opacity-50">*/}
        {/*            ❤️*/}
        {/*          </div>*/}
        {/*          <div className="text-xs font-mono px-3 py-1 rounded bg-orange-400 bg-opacity-50">*/}
        {/*            🤝*/}
        {/*          </div>*/}
        {/*          <div className="text-xs font-mono px-3 py-1 rounded bg-gray-500 bg-opacity-50">*/}
        {/*            ⚙️*/}
        {/*          </div>*/}
        {/*          <div className="text-xs font-mono px-3 py-1 rounded bg-purple-500 bg-opacity-50">*/}
        {/*            😤*/}
        {/*          </div>*/}
        {/*          <div className="text-xs font-mono px-3 py-1 rounded bg-green-400 bg-opacity-50">*/}
        {/*            💰*/}
        {/*          </div>*/}
        {/*          <div className="text-xs font-mono px-3 py-1 rounded bg-blue-500 bg-opacity-50">*/}
        {/*            ⚖️*/}
        {/*          </div>*/}
        {/*        </CommandItem>*/}
        {/*  </CommandList>*/}
        {/*</CommandGroup>*/}
        <CommandGroup heading="Similarity Search">
          <CommandList className={"w-full"}>
            <CommandEmpty>No results found.</CommandEmpty>
            {searching && <div className="flex justify-center py-3"><BarLoader width="90%" /></div>}
            {Object.entries(displayResults).map(([text, stereotype]) => (
                <CommandItem
                    key={text}
                    value={text}
                    className="data-[selected='true']:bg-zinc-50  flex items-center justify-between py-3"
                    // onSelect={(p) => {
                    //   console.log(p)
                    //   toast.success(`You selected ${p}!`)
                    // }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">
                        {text.substring(0, 90)}
                      </p>
                    </div>
                  </div>
                    {stereotype.similarity ? (
                        <div className="text-xs font-mono p-0.5 rounded bg-zinc-100">
                          {stereotype.similarity.toFixed(3)}
                        </div>
                    ) : (
                        <div />
                    )}
                </CommandItem>
            ))}
          </CommandList>
        </CommandGroup>
        <CommandGroup heading="GPT Stereotype Description">
          {writing && <div className="flex justify-center py-3"><BarLoader width="90%" /></div>}
          <CommandItem
              key="gpt-res"
              className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-500">{gptResults}</p>
            </div>
          </CommandItem>
        </CommandGroup>
      </Command>
    </div>
  )
}

Search.displayName = 'Search'
