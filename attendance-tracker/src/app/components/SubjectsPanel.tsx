'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Subject = {
  id: string
  name: string
  type: 'theory' | 'lab'
}

export default function SubjectsPanel() {
  const router = useRouter()
  const supabase = createClient()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [type, setType] = useState<'theory' | 'lab'>('theory')

  async function loadSubjects() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setSubjects(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadSubjects()
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('subjects').insert({
      user_id: user.id,
      name: name.trim(),
      type,
    })
    setName('')
    loadSubjects()
    router.refresh()
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this subject? Past attendance records stay in history.')) return
    await supabase.from('subjects').delete().eq('id', id)
    loadSubjects()
    router.refresh()
  }

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>

  return (
    <div>
        <p className="text-xs text-gray-500 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-4">
      Add all the classes and labs you have this semester. Once added, you can select these subjects each day to mark your attendance.
    </p>
      <div className="space-y-2 mb-6">
        {subjects.length === 0 && (
          <p className="text-sm text-gray-400">No subjects yet — add your first one below.</p>
        )}
        {subjects.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-900">{s.name}</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  s.type === 'lab'
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {s.type}
              </span>
            </div>
            <button
              onClick={() => handleRemove(s.id)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Data Structures"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'theory' | 'lab')}
          className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="theory">Theory</option>
          <option value="lab">Lab</option>
        </select>
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg font-medium"
        >
          Add
        </button>
      </form>
    </div>
  )
}