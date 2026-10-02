export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'
export const tokenKey = 'rinq.admin.token'

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem(tokenKey) ?? ''}`,
      ...(init?.headers ?? {}),
    },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok)
    throw new Error(payload?.error?.message ?? 'Não foi possível concluir a operação.')
  return payload as T
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(value))
    .replace('.', '')
}

export function formatCoins(value: number) {
  return `${new Intl.NumberFormat('pt-BR').format(value)} COINS`
}
