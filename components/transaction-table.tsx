interface Transaction {
  id: string
  name: string
  amount: string
  status: "completed" | "pending" | "failed"
  date: string
}

interface TransactionTableProps {
  transactions: Transaction[]
  title?: string
}

const statusStyles = {
  completed: "bg-green-500/10 text-green-500 border-green-500/30",
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  failed: "bg-red-500/10 text-red-500 border-red-500/30",
}

const statusLabels = {
  completed: "Завершено",
  pending: "Ожидание",
  failed: "Ошибка",
}

export function TransactionTable({ transactions, title = "Транзакции" }: TransactionTableProps) {
  return (
    <div className="rounded-lg bg-card border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Название</th>
              <th className="text-right py-3 px-2 text-muted-foreground font-medium">Сумма</th>
              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Статус</th>
              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Дата</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-2 text-foreground font-medium">{tx.name}</td>
                <td className="py-3 px-2 text-right text-foreground font-semibold">{tx.amount}</td>
                <td className="py-3 px-2">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium border ${statusStyles[tx.status]}`}
                  >
                    {statusLabels[tx.status]}
                  </span>
                </td>
                <td className="py-3 px-2 text-muted-foreground">{tx.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
