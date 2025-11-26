import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

const MOTION_EXTENSIONS = new Set(['.vrma'])

const walkMotionFiles = async (
  dir: string,
  rootDir: string,
  results: string[]
) => {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walkMotionFiles(fullPath, rootDir, results)
      continue
    }

    const ext = path.extname(entry.name).toLowerCase()
    if (MOTION_EXTENSIONS.has(ext)) {
      const relativePath = path
        .relative(rootDir, fullPath)
        .split(path.sep)
        .join('/')
      results.push(`/${relativePath}`)
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const publicDir = path.join(process.cwd(), 'public')

  try {
    if (!fs.existsSync(publicDir)) {
      return res.status(200).json([])
    }

    const motions: string[] = []
    await walkMotionFiles(publicDir, publicDir, motions)
    res.status(200).json(motions)
  } catch (error) {
    console.error('Error reading motion files:', error)
    res.status(500).json({ error: 'Failed to get motion file list' })
  }
}
