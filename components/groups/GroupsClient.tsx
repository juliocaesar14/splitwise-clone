'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Member {
  id: string
  userId: string
  role: string
}

interface Group {
  id: string
  name: string
  description: string | null
  currency: string
  type: string
  members: Member[]
}

export default function GroupsClient() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/groups')
      .then(res => res.json())
      .then(json => setGroups(Array.isArray(json) ? json : json.groups ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Link href="/groups/new">
          <Button className="bg-green-600 hover:bg-green-700">+ New Group</Button>
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">You have no groups yet.</p>
          <Link href="/groups/new">
            <Button className="bg-green-600 hover:bg-green-700">Create your first group</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => (
            <Link href={`/groups/${group.id}`} key={group.id}>
              <Card className={`hover:shadow-md transition-shadow cursor-pointer ${group.type === 'DIRECT' ? 'border-blue-200' : ''}`}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${group.type === 'DIRECT' ? 'bg-blue-500' : 'bg-green-500'}`}>
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-xs text-gray-500">
                        {group.type === 'DIRECT' ? '1-on-1' : `${group.members.length} member${group.members.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 text-sm">{group.currency}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}


