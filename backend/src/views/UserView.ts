import type { UserModel as UserRow } from '../../generated/prisma/models.js'

export interface UserDTO {
  id: string
  name: string
  email: string
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
      virtualCoins: user.virtualCoins,
      createdAt: user.createdAt.toISOString(),
    }
  }

  static renderMany(users: UserRow[]): UserDTO[] {
    return users.map(UserView.render)
  }
}
