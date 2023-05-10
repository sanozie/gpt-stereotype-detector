'use client'

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/command'
import { type Stereotype } from '@prisma/client'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { useDebounce } from 'use-debounce'
import { type StereotypeVector, type StereotypeSearch } from '@/types/stereotypes'

export interface SearchProps {
  searchStereotypes: (
    content: string
  ) => Promise<Array<StereotypeSearch>>
  generateGPTResponse: (
      stereotypes: StereotypeVector[]
  ) => Promise<string>
}

export function Search({ searchStereotypes, generateGPTResponse }: SearchProps) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    Array<StereotypeSearch>
  >([])
  const [debouncedQuery] = useDebounce(query, 150)

  // Run searchStereotypes function and update searchResults hook
  useEffect(() => {
    let current = true
    if (debouncedQuery.trim().length > 0) {
      searchStereotypes(debouncedQuery).then((results) => {
        if (current) {
          setSearchResults(results)
        }
      })
    }
    return () => {
      current = false
    }
  }, [debouncedQuery, searchStereotypes])

  // On searchResults update, have ChatGPT create profile based on search results
  useEffect(() => {
    console.log("this where chat gpt does ting")
    if (searchResults.length > 0) {
      generateGPTResponse(searchResults).then(res => {
        console.log(res)
      })
    }
  }, [searchResults])
  return (
    <div className="w-full">
      <Command label="Command Menu" shouldFilter={false} className="h-[200px]">
        <CommandInput
          id="search"
          placeholder="Search for Stereotype"
          className="focus:ring-0 sm:text-sm text-base focus:border-0 border-0 active:ring-0 active:border-0 ring-0 outline-0"
          value={query}
          onValueChange={(q) => setQuery(q)}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {searchResults.map((stereotype) => (
            <CommandItem
              key={stereotype.id}
              value={stereotype.text}
              className="data-[selected='true']:bg-zinc-50  flex items-center justify-between py-3"
              onSelect={(p) => {
                console.log(p)
                toast.success(`You selected ${p}!`)
              }}
            >
              <div className="flex items-center space-x-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">
                    {stereotype.text.substring(0, 90)}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {stereotype.similarity ? (
                  <div className="text-xs font-mono p-0.5 rounded bg-zinc-100">
                    {stereotype.similarity.toFixed(3)}
                  </div>
                ) : (
                  <div />
                )}
              </div>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </div>
  )
}

Search.displayName = 'Search'
