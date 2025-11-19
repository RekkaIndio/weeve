import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: true, likes: true, comments: true },
    })
    return res.status(200).json(posts)
  }

  if (req.method === 'POST') {
    const session = await getSession({ req })
    if (!session?.user?.email) return res.status(401).end()

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return res.status(401).end()

    const { content, imageUrl } = req.body
    if (!content) return res.status(400).json({ error: 'Missing content' })

    const post = await prisma.post.create({
      data: { content, imageUrl, authorId: user.id },
    })
    return res.status(201).json(post)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
