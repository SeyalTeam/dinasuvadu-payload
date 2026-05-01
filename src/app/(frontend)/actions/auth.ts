'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'
import { getServerSideURL } from '@/utilities/getURL'

export type SignupData = {
  fullName: string
  email: string
  password: string
  mobile?: string
}

interface PostImageActionsProps {
  url: string;
  title: string;
  postSlug: string; 
  description?: string;
}

export const checkUserAction = async (identifier: string) => {
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'users',
      where: {
        or: [
          { email: { equals: identifier } },
          { mobile: { equals: identifier } }
        ]
      }
    })
    return { exists: res.totalDocs > 0 }
  } catch (error) {
    console.error('Check User Error:', error)
    return { exists: false, error: 'Database check failed' }
  }
}

export const signinAction = async (data: any) => {
  try {
    const payload = await getPayload({ config })
    const res = await payload.login({
      collection: 'users',
      data: {
        email: data.email,
        password: data.password,
      }
    })

    if (res.token) {
      const cookieStore = await cookies()
      cookieStore.set('payload-token', res.token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      })
      // Set a public user-id cookie to help with server-side lookup
      cookieStore.set('user-id', String(res.user.id), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      })
      return { success: true, user: res.user }
    }
    return { success: false, error: 'Invalid credentials' }
  } catch (error: any) {
    return { success: false, error: error.message || 'Login failed' }
  }
}

export const signupAction = async (data: any) => {
  console.log('Signup Action Started for:', data.email)
  try {
    console.log('Getting Payload instance...')
    const payload = await getPayload({ config })
    console.log('Payload instance acquired.')

    // 1. Create the user
    console.log('Attempting to create user in DB...')
    const newUser = await payload.create({
      collection: 'users',
      data: {
        name: data.fullName,
        email: data.email,
        password: data.password,
        mobile: data.mobile,
      },
    })

    if (!newUser) {
      console.error('User creation returned null/undefined')
      return { success: false, error: 'Failed to create user' }
    }
    console.log('User created successfully:', newUser.id)

    // 2. Log them in automatically
    console.log('Attempting auto-login...')
    const loginResult = await payload.login({
      collection: 'users',
      data: {
        email: data.email,
        password: data.password,
      },
    })
    console.log('Login result acquired.')

    if (loginResult.token) {
      console.log('Setting session cookie...')
      const cookieStore = await cookies()
      cookieStore.set('payload-token', loginResult.token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      })
      cookieStore.set('user-id', String(newUser.id), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      })
      console.log('Session cookies set.')
    }

    return { success: true, user: newUser }
  } catch (error: any) {
    console.error('SIGNUP ERROR:', error)
    return { 
      success: false, 
      error: error.message || 'An error occurred during signup' 
    }
  }
}
export const getMeAction = async () => {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value
    const userId = cookieStore.get('user-id')?.value

    if (!token || !userId) return { user: null }

    const payload = await getPayload({ config })
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    })

    return { user: user || null }
  } catch (error) {
    console.error('[Server Action] Error in getMeAction:', error)
    return { user: null }
  }
}

export const submitCommentAction = async (data: { postSlug: string, userId: string, content: string }) => {
  console.log('[Comment Action] Starting submission for:', data.postSlug);
  try {
    const payload = await getPayload({ config })
    
    // 1. Find the post by slug
    console.log('[Comment Action] Searching for post slug:', data.postSlug);
    const posts = await payload.find({
      collection: 'posts',
      where: {
        slug: { equals: data.postSlug }
      }
    })

    console.log('[Comment Action] Post search result total:', posts.totalDocs);

    if (posts.totalDocs === 0) {
      console.error('[Comment Action] Post not found for slug:', data.postSlug);
      return { success: false, error: 'Post not found' }
    }

    const postId = posts.docs?.[0]?.id;
    if (!postId) {
      console.error('[Comment Action] Post document missing ID');
      return { success: false, error: 'Post data corrupted' };
    }

    // 2. Create the comment
    console.log('[Comment Action] Creating comment in DB...');
    const newComment = await payload.create({
      collection: 'comments' as any, // Use any to bypass temporary type issues
      data: {
        user: data.userId,
        post: postId,
        content: data.content,
        status: 'pending',
      } as any
    })

    if (newComment) {
      console.log('[Comment Action] Success! Comment created:', newComment.id);
      return { success: true, comment: newComment }
    }
    
    console.error('[Comment Action] Create returned null');
    return { success: false, error: 'Failed to create comment' }
  } catch (error: any) {
    console.error('[Comment Action] ERROR:', error.message);
    if (error.data) console.error('[Comment Action] Error Data:', JSON.stringify(error.data));
    return { success: false, error: error.message || 'Failed to submit comment' }
  }
}
