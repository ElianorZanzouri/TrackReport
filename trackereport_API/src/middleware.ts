import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// We add a "userId" field to the request to pass it to the routes.
export interface AuthRequest extends Request {
  userId?: string
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  // 1. Get the token from the "Authorization: Bearer <token>" header.
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Token missing.' })
  }

  try {
    // 2. Verify the token and extract the user identifier.
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      sub: string
    }
    req.userId = payload.sub
    // 3. All good: let it pass to the route.
    next()
  } catch {
    return res.status(401).json({ error: 'Token invalid or expired.' })
  }
}
