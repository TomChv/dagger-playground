export type FixtureLink = {
  slug: string
  target: string
  clicks: number
  expired: boolean
}

export type Redirect = {
  status: 301 | 404 | 410
  location?: string
}

export function redirectFor(link: FixtureLink | undefined): Redirect {
  if (link === undefined) {
    return { status: 404 }
  }

  if (link.expired) {
    return { status: 410 }
  }

  return { status: 301, location: link.target }
}
