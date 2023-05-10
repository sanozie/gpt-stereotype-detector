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
import { useDebounce } from 'use-debounce'
import { type StereotypeVector, type StereotypeSearch } from '@/types/stereotypes'
import { BarLoader } from 'react-spinners'

export interface SearchProps {
  searchStereotypes: (
    content: string
  ) => Promise<Array<StereotypeSearch>>
  generateGPTResponse: (
      stereotypes: StereotypeSearch[]
  ) => Promise<string>
}

type DisplayResults = Record<string, { id: string, similarity: number | undefined }>

export function Search({ searchStereotypes, generateGPTResponse }: SearchProps) {
  const [query, setQuery] = useState('')
  const [displayResults, setDisplayResults] = useState<DisplayResults>({})
  const [gptResults, setGptResults] = useState('')
  const [debouncedQuery] = useDebounce(query, 150)
  const [searching, setSearching] = useState(false)
  const [writing, setWriting] = useState(false)

  // Run searchStereotypes function and update searchResults hook
  useEffect(() => {
    let current = true
    if (debouncedQuery.trim().length > 0) {
      setSearching(true)
      searchStereotypes(debouncedQuery).then((results) => {
        if (current && results.length > 0) {
          setSearching(false)
          setWriting(true)
          generateGPTResponse(results).then(res => {
            setWriting(false)
            setGptResults(res)
          })

          const uniques: DisplayResults = {}
          for (let { id, text, similarity } of results) {
            uniques[text] = { id, similarity }
          }
          setDisplayResults(uniques)
        }
      })
    }
    return () => {
      current = false
    }
  }, [debouncedQuery, searchStereotypes])
  return (
    <div className="w-full">
      <Command label="Command Menu" shouldFilter={false} className="h-auto">
        <CommandInput
          id="search"
          placeholder="Search for Stereotype"
          className="focus:ring-0 sm:text-sm text-base focus:border-0 border-0 active:ring-0 active:border-0 ring-0 outline-0"
          value={query}
          onValueChange={(q) => setQuery(q)}
        />
        <CommandGroup heading="Similarity Search">
          <CommandList className={"w-full"}>
            <CommandEmpty>No results found.</CommandEmpty>
            {searching && <div className="flex justify-center py-3"><BarLoader width="90%" /></div>}
            {Object.entries(displayResults).map(([text, { id, similarity }]) => (
                <CommandItem
                    key={id}
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
                  <div className="text-sm text-gray-500">
                    {similarity ? (
                        <div className="text-xs font-mono p-0.5 rounded bg-zinc-100">
                          {similarity.toFixed(3)}
                        </div>
                    ) : (
                        <div />
                    )}
                  </div>
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
