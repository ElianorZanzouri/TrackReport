import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// On ajoute un champ "userId" à la requête, pour le transmettre aux routes.
export interface AuthRequest extends Request {
  userId?: string
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  // 1. Récupérer le jeton depuis l'en-tête "Authorization: Bearer <token>".
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Jeton manquant.' })
  }

  try {
    // 2. Vérifier le jeton et en extraire l'identifiant utilisateur.
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      sub: string
    }
    req.userId = payload.sub
    // 3. Tout est bon : on laisse passer vers la route.
    next()
  } catch {
    return res.status(401).json({ error: 'Jeton invalide ou expiré.' })
  }
}
