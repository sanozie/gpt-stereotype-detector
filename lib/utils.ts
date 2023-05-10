import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Ratelimit } from '@upstash/ratelimit'
import { type Stereotype, StereotypeSearch, type StereotypeVector } from '@/types/stereotypes'
import kv from '@vercel/kv'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Create a new ratelimiter, that allows 10 requests per 10 seconds
export const ratelimit = new Ratelimit({
  redis: kv as any,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  /**
   * Optional prefix for the keys used in redis. This is useful if you want to share a redis
   * instance with other applications and want to avoid key collisions. The default prefix is
   * "@upstash/ratelimit"
   */
  prefix: '@upstash/ratelimit',
})

export const reduceStereotypes = (stereotypes: StereotypeVector[] | Stereotype[] | StereotypeSearch[]) => {
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
  for (let row of stereotypes) {
    for (column in reducer) {
      reducer[column] = reducer[column] + parseInt(row[column])
    }
  }

  for (column in reducer) {
    reducer[column] = reducer[column] / stereotypes.length
  }

  return reducer
}
