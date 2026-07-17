'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Entry = {
  id: string
  subject_id: string
  session_number: number
  status: 'present' | 'absent'
}
type Day = {
  id: string
  date: string
  day_name: string
  entries: Entry[]
}
type Subject = { id: string; name: string; type: 'theory' | 'lab' }

export default function HistoryPanel() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState<Day[]>([])
  const [subjects, setSubjects] = useState<Record<string, Subject>>({})
  const [editingDay, setEditingDay] = useState<string | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: subjectRows } = await supabase
      .from('subjects')
      .select('id, name, type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    const subjectMap: Record<string, Subject> = {}
    ;(subjectRows ?? []).forEach((s) => (subjectMap[s.id] = s))
    setSubjects(subjectMap)

    const { data: dayRows } = await supabase
      .from('attendance_days')
      .select('id, date, day_name')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    const dayIds = (dayRows ?? []).map((d) => d.id)
    let entryRows: (Entry & { attendance_day_id: string })[] = []
    if (dayIds.length > 0) {
      const { data } = await supabase
        .from('day_entries')
        .select('id, subject_id, session_number, status, attendance_day_id')
        .in('attendance_day_id', dayIds)
        .order('session_number', { ascending: true })
      entryRows = data ?? []
    }

    const combined: Day[] = (dayRows ?? []).map((d) => {
      const dayEntries = entryRows.filter((e) => e.attendance_day_id === d.id)
      // stable order: by subject creation order, then session number
      const subjectOrder = Object.keys(subjectMap)
      dayEntries.sort((a, b) => {
        const subjDiff = subjectOrder.indexOf(a.subject_id) - subjectOrder.indexOf(b.subject_id)
        if (subjDiff !== 0) return subjDiff
        return a.session_number - b.session_number
      })
      return { ...d, entries: dayEntries }
    })

    setDays(combined)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function toggleStatus(entryId: string, newStatus: 'present' | 'absent') {
    await supabase.from('day_entries').update({ status: newStatus }).eq('id', entryId)
    await load()
    router.refresh()
  }

  async function deleteDay(dayId: string) {
    if (!confirm("Delete this day's attendance? This can't be undone.")) return
    await supabase.from('attendance_days').delete().eq('id', dayId)
    if (editingDay === dayId) setEditingDay(null)
    await load()
    router.refresh()
  }

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>

  if (days.length === 0) {
    return <p className="text-sm text-gray-400">No days logged yet.</p>
  }

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const isEditing = editingDay === day.id
        return (
          <div key={day.id} className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-900">
                {day.day_name}, {day.date}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingDay(isEditing ? null : day.id)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {isEditing ? 'Done' : 'Edit'}
                </button>
                <button
                  onClick={() => deleteDay(day.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {day.entries.map((e) => {
                const subj = subjects[e.subject_id]
                const sameSubjectCount = day.entries.filter((x) => x.subject_id === e.subject_id).length
                const label =
                  (subj?.name ?? 'Deleted subject') +
                  (sameSubjectCount > 1 ? ` (session ${e.session_number})` : '')

                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <span className="text-xs text-gray-600">{label}</span>

                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleStatus(e.id, 'present')}
                          className={`text-xs px-3 py-1 rounded-md border font-medium ${
                            e.status === 'present'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'border-gray-300 text-gray-600 hover:bg-white'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => toggleStatus(e.id, 'absent')}
                          className={`text-xs px-3 py-1 rounded-md border font-medium ${
                            e.status === 'absent'
                              ? 'bg-red-500 text-white border-red-500'
                              : 'border-gray-300 text-gray-600 hover:bg-white'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-xs font-medium ${
                          e.status === 'present' ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {e.status === 'present' ? 'Present' : 'Absent'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}