import type { UserModel as UserRow } from '../../generated/prisma/models.js'
import type { UserRole } from '../../generated/prisma/enums.js'

export interface UserDTO {
  id: string
  name: string
  email: string
  role: UserRole
  virtualCoins: number
  createdAt: string
}

/** RF01 — perfil e carteira virtual. */
export class UserView {
  static render(user: UserRow): UserDTO {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      virtualCoins: user.virtualCoins,
      createdAt: user.createdAt.toISOString(),
    }
  }

  static renderMany(users: UserRow[]): UserDTO[] {
    return users.map(UserView.render)
  }
}
