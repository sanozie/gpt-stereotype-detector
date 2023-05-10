import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Ratelimit } from '@upstash/ratelimit'
import { type Reducer, type Stereotype, StereotypeSearch, type StereotypeVector } from '@/types/stereotypes'
import kv from '@vercel/kv'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Create a new ratelimiter, that allows 30 requests per 10 seconds
export const ratelimit = new Ratelimit({
  redis: kv as any,
  limiter: Ratelimit.slidingWindow(30, '10 s'),
  analytics: true,
  /**
   * Optional prefix for the keys used in redis. This is useful if you want to share a redis
   * instance with other applications and want to avoid key collisions. The default prefix is
   * "@upstash/ratelimit"
   */
  prefix: '@upstash/ratelimit',
})

// Will write overloading logic eventually
export function reduceStereotypes(initial: Reducer, stereotypes: any,
                                  modifier: (row: any, column: keyof Reducer) => number) {
  let reducer = { ...initial }
  let column: keyof typeof reducer
  for (let row of stereotypes) {
    for (column in reducer) {
      reducer[column] = reducer[column] + modifier(row, column)
    }
  }

  return reducer
}
