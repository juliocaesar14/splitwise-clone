'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function NewGroupClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    currency: 'INR',
  })

  async function handleSubmit() {
    console.log('Submit clicked', form)
    if (!form.name.trim()) {
      setError('Group name is required')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    console.log('Response status:', res.status)
    const data = await res.json()
    console.log('Response data:', data)
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Failed to create group')
      return
    }

    router.push(`/groups/${data.id ?? data.group?.id}`)
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create a new group</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Group details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Group name *</label>
            <Input
              placeholder="e.g. Goa Trip, Flatmates"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Input
              placeholder="Optional description"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Currency</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={form.currency}
              onChange={e => setForm({ ...form, currency: e.target.value })}
            >
              <option value="INR">INR — Indian Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
            </select>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              className="bg-green-600 hover:bg-green-700 flex-1"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/groups')}
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

