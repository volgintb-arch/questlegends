export async function clickToCall(phone: string, getAuthHeaders: () => Record<string, string>) {
  if (!phone) return

  const res = await fetch("/api/sipuni/call", {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Ошибка звонка")
  }

  return data
}
