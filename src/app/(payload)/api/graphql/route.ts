/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from '@payload-config'
import { GRAPHQL_POST, REST_OPTIONS } from '@payloadcms/next/routes'

export async function POST(request: Request) {
  return (GRAPHQL_POST(config) as any)(request, { params: Promise.resolve({}) })
}

export async function OPTIONS(request: Request) {
  return (REST_OPTIONS(config) as any)(request, { params: Promise.resolve({}) })
}
