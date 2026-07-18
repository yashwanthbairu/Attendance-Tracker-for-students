'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Entry = {
  id: string
  subject_id: string
  session_number: number
  status: 'present' | 'absent'
  attendance_day_id: string
}
type Subject = { id: string; name: string; type: 'theory' | 'lab' }
type Day = {
  date: string
  day_name: string
  primaryDayId: string
  allDayIds: string[]
  entries: Entry[]
}

export default function HistoryPanel() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState<Day[]>([])
  const [subjects, setSubjects] = useState<Record<string, Subject>>({})
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [addingSubjectId, setAddingSubjectId] = useState<Record<string, string>>({})

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

    const dayIds = (dayRows ?? []).map((d) => d.id)
    let entryRows: Entry[] = []
    if (dayIds.length > 0) {
      const { data } = await supabase
        .from('day_entries')
        .select('id, subject_id, session_number, status, attendance_day_id')
        .in('attendance_day_id', dayIds)
      entryRows = data ?? []
    }

    const byDate: Record<string, { dayIds: string[]; day_name: string }> = {}
    ;(dayRows ?? []).forEach((d) => {
      if (!byDate[d.date]) byDate[d.date] = { dayIds: [], day_name: d.day_name }
      byDate[d.date].dayIds.push(d.id)
    })

    const subjectOrder = Object.keys(subjectMap)
    const combined: Day[] = Object.entries(byDate).map(([date, info]) => {
      const dayEntries = entryRows.filter((e) => info.dayIds.includes(e.attendance_day_id))
      dayEntries.sort((a, b) => {
        const diff = subjectOrder.indexOf(a.subject_id) - subjectOrder.indexOf(b.subject_id)
        return diff !== 0 ? diff : a.session_number - b.session_number
      })
      return {
        date,
        day_name: info.day_name,
        primaryDayId: info.dayIds[0],
        allDayIds: info.dayIds,
        entries: dayEntries,
      }
    })

    combined.sort((a, b) => b.date.localeCompare(a.date))
    setDays(combined)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function toggleStatus(entryId: string, newStatus: 'present' | 'absent') {
    await supabase.from('day_entries').update({ status: newStatus }).eq('id', entryId)
    await load()
  }

  async function deleteDay(day: Day) {
    if (!confirm("Delete this day's attendance? This can't be undone.")) return
    await supabase.from('attendance_days').delete().in('id', day.allDayIds)
    if (editingDate === day.date) setEditingDate(null)
    await load()
  }

  async function deleteEntry(entryId: string) {
    if (!confirm('Remove this class entry?')) return
    await supabase.from('day_entries').delete().eq('id', entryId)
    await load()
  }

  async function addEntry(day: Day) {
    const subjectId = addingSubjectId[day.date]
    if (!subjectId) return

    const existingForSubject = day.entries.filter((e) => e.subject_id === subjectId)
    const nextSession = existingForSubject.length + 1

    await supabase.from('day_entries').insert({
      attendance_day_id: day.primaryDayId,
      subject_id: subjectId,
      session_number: nextSession,
      status: 'present',
    })

    setAddingSubjectId((prev) => ({ ...prev, [day.date]: '' }))
    await load()
  }

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>
if (days.length === 0) return <p className="text-sm text-gray-400">No days logged yet.</p>

return (
  <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
    {days.map((day) => {
        const isEditing = editingDate === day.date
        return (
          <div key={day.date} className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-900">
                {day.day_name}, {day.date}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingDate(isEditing ? null : day.date)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {isEditing ? 'Done' : 'Edit'}
                </button>
                <button
                  onClick={() => deleteDay(day)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Delete day
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
                      <div className="flex items-center gap-2">
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
                        <button
                          onClick={() => deleteEntry(e.id)}
                          className="text-xs text-red-400 hover:text-red-600 ml-1"
                        >
                          ✕
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

            {isEditing && (
              <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-3 border-t border-gray-100">
                <select
                  value={addingSubjectId[day.date] ?? ''}
                  onChange={(e) =>
                    setAddingSubjectId((prev) => ({ ...prev, [day.date]: e.target.value }))
                  }
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Add a class...</option>
                  {Object.values(subjects).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.type})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => addEntry(day)}
                  disabled={!addingSubjectId[day.date]}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}