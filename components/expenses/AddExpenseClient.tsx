'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface Member {
  userId: string
  user: {
    id: string
    name: string
  }
}

interface SplitInput {
  userId: string
  name: string
  amount: string
  percentage: string
  shares: string
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function AddExpenseClient({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [payerId, setPayerId] = useState('')
  const [splitType, setSplitType] = useState<'EQUAL' | 'UNEQUAL' | 'PERCENTAGE' | 'SHARE'>('EQUAL')
  const [splits, setSplits] = useState<SplitInput[]>([])

  useEffect(() => {
    fetch(`/api/groups/${groupId}`)
      .then(r => r.json())
      .then(data => {
        const grpMembers = data.members ?? data.group?.members ?? []
        // Deduplicate members by userId
        const unique = grpMembers.filter((m: Member, i: number, arr: Member[]) =>
          arr.findIndex(x => x.userId === m.userId) === i
        )
        setMembers(unique)
        setPayerId(unique[0]?.userId ?? '')
        setSplits(unique.map((m: Member) => ({
          userId: m.userId,
          name: m.user.name,
          amount: '',
          percentage: '',
          shares: '1',
        })))
      })
  }, [groupId])

  const pieData = splits.map(s => ({
    name: s.name,
    value: splitType === 'EQUAL'
      ? (Number(amount) / splits.length) || 0
      : splitType === 'UNEQUAL'
        ? Number(s.amount) || 0
        : splitType === 'PERCENTAGE'
          ? (Number(s.percentage) / 100) * Number(amount) || 0
          : Number(s.shares) || 0,
  })).filter(d => d.value > 0)

  async function handleSubmit() {
    if (!title.trim()) { setError('Title is required'); return }
    if (!amount || Number(amount) <= 0) { setError('Amount must be greater than 0'); return }
    if (!payerId) { setError('Select who paid'); return }

    let splitsPayload: { userId: string; amount: number }[] = []
    const total = Number(amount)

    if (splitType === 'EQUAL') {
      const each = total / splits.length
      splitsPayload = splits.map(s => ({ userId: s.userId, amount: each }))
    } else if (splitType === 'UNEQUAL') {
      const sum = splits.reduce((acc, s) => acc + Number(s.amount), 0)
      if (Math.abs(sum - total) > 0.01) {
        setError(`Split amounts must add up to ₹${total}. Currently ₹${sum.toFixed(2)}`); return
      }
      splitsPayload = splits.map(s => ({ userId: s.userId, amount: Number(s.amount) }))
    } else if (splitType === 'PERCENTAGE') {
      const totalPct = splits.reduce((acc, s) => acc + Number(s.percentage), 0)
      if (Math.abs(totalPct - 100) > 0.01) {
        setError(`Percentages must add up to 100%. Currently ${totalPct.toFixed(1)}%`); return
      }
      splitsPayload = splits.map(s => ({ userId: s.userId, amount: (Number(s.percentage) / 100) * total }))
    } else if (splitType === 'SHARE') {
      const totalShares = splits.reduce((acc, s) => acc + Number(s.shares), 0)
      splitsPayload = splits.map(s => ({ userId: s.userId, amount: (Number(s.shares) / totalShares) * total }))
    }

    setLoading(true)
    setError('')

    const res = await fetch(`/api/groups/${groupId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        totalAmount: total,
        payerId: payerId,
        splitType,
        splits: splitsPayload,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Failed to create expense')
      return
    }

    router.push(`/groups/${groupId}`)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.push(`/groups/${groupId}`)} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to group
        </button>
        <h1 className="text-2xl font-bold mt-1">Add Expense</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div>
            <label className="text-sm font-medium mb-1 block">Title *</label>
            <Input
              placeholder="e.g. Dinner, Petrol, Rent"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Amount (₹) *</label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Paid by *</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={payerId}
              onChange={e => setPayerId(e.target.value)}
            >
              {members.map(m => (
                <option key={`payer-${m.userId}`} value={m.userId}>{m.user.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Split type</label>
            <div className="flex gap-2 flex-wrap">
              {(['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARE'] as const).map(type => (
                <button
                  key={`split-type-${type}`}
                  onClick={() => setSplitType(type)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    splitType === type
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {splitType !== 'EQUAL' && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                {splitType === 'UNEQUAL' ? 'Amount per person' : splitType === 'PERCENTAGE' ? 'Percentage per person' : 'Shares per person'}
              </label>
              <div className="space-y-2">
                {splits.map((split, i) => (
                  <div key={`split-input-${split.userId}`} className="flex items-center gap-3">
                    <span className="text-sm w-32 truncate">{split.name}</span>
                    <Input
                      type="number"
                      placeholder={splitType === 'PERCENTAGE' ? '%' : splitType === 'SHARE' ? 'shares' : '₹'}
                      value={splitType === 'UNEQUAL' ? split.amount : splitType === 'PERCENTAGE' ? split.percentage : split.shares}
                      onChange={e => {
                        const updated = [...splits]
                        if (splitType === 'UNEQUAL') updated[i].amount = e.target.value
                        else if (splitType === 'PERCENTAGE') updated[i].percentage = e.target.value
                        else updated[i].shares = e.target.value
                        setSplits(updated)
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {splitType === 'PERCENTAGE' && pieData.length > 0 && Number(amount) > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Split preview</label>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {pieData.map((_, index) => (
                      <Cell key={`pie-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              className="bg-green-600 hover:bg-green-700 flex-1"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/groups/${groupId}`)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}