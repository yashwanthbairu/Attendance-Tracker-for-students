'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Subject = { id: string; name: string; type: 'theory' | 'lab' }

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function dayName(dateStr: string) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    new Date(dateStr + 'T00:00:00').getDay()
  ]
}

export default function TodayPanel() {
  const supabase = createClient()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [date, setDate] = useState(todayISO())
  const [dName, setDName] = useState(dayName(todayISO()))
  const [userEditedDate, setUserEditedDate] = useState(false)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [statuses, setStatuses] = useState<Record<string, 'present' | 'absent'>>({})
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      const list = data ?? []
      setSubjects(list)
      const initialCounts: Record<string, number> = {}
      list.forEach((s) => (initialCounts[s.id] = 0))
      setCounts(initialCounts)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const current = todayISO()
      if (!userEditedDate && current !== date) {
        setDate(current)
        setDName(dayName(current))
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [date, userEditedDate])

  function changeDate(newDate: string) {
    setDate(newDate)
    setDName(dayName(newDate))
    setUserEditedDate(true)
    setMessage(null)
  }

  function setCount(subjectId: string, delta: number) {
    setCounts((prev) => ({
      ...prev,
      [subjectId]: Math.max(0, (prev[subjectId] ?? 0) + delta),
    }))
  }

  function setStatus(key: string, status: 'present' | 'absent') {
    setStatuses((prev) => ({ ...prev, [key]: status }))
  }

  async function handleSave() {
    const entries: { subjectId: string; sessionNumber: number; status: string }[] = []
    let allMarked = true

    for (const s of subjects) {
      const count = counts[s.id] ?? 0
      for (let i = 0; i < count; i++) {
        const key = `${s.id}_${i}`
        const status = statuses[key]
        if (!status) {
          allMarked = false
          break
        }
        entries.push({ subjectId: s.id, sessionNumber: i + 1, status })
      }
      if (!allMarked) break
    }

    if (!allMarked) {
      setMessage({ text: 'Please mark present/absent for every session before saving.', type: 'error' })
      return
    }
    if (entries.length === 0) {
      setMessage({ text: 'Select at least one class or lab for the day.', type: 'error' })
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: existingDay } = await supabase
      .from('attendance_days')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle()

    if (existingDay) {
      alert('You are trying to add records of a day you have already entered. You can edit that in the History section, or delete that day from History and come back here.')
      setSaving(false)
      return
    }

    const { data: dayRow, error: dayError } = await supabase
      .from('attendance_days')
      .insert({ user_id: user.id, date, day_name: dName })
      .select()
      .single()

    if (dayError || !dayRow) {
      setMessage({ text: 'Something went wrong saving the day. Try again.', type: 'error' })
      setSaving(false)
      return
    }

    const rows = entries.map((e) => ({
      attendance_day_id: dayRow.id,
      subject_id: e.subjectId,
      session_number: e.sessionNumber,
      status: e.status,
    }))

    await supabase.from('day_entries').insert(rows)

    setSaving(false)
    setCounts(Object.fromEntries(subjects.map((s) => [s.id, 0])))
    setStatuses({})
    setMessage({ text: 'Day saved successfully.', type: 'success' })
    setTimeout(() => setMessage(null), 3000)
  }

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>

  if (subjects.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Add subjects first in the Subjects tab before logging a day.
      </p>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => changeDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">Day</label>
          <input
            value={dName}
            onChange={(e) => setDName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        {subjects.map((s) => {
          const count = counts[s.id] ?? 0
          return (
            <div key={s.id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCount(s.id, -1)}
                    className="w-6 h-6 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm"
                  >
                    −
                  </button>
                  <span className="text-sm w-4 text-center">{count}</span>
                  <button
                    onClick={() => setCount(s.id, 1)}
                    className="w-6 h-6 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {count > 0 && (
                <div className="mt-3 space-y-2">
                  {Array.from({ length: count }).map((_, i) => {
                    const key = `${s.id}_${i}`
                    const status = statuses[key]
                    return (
                      <div
                        key={key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2"
                      >
                        <span className="text-xs text-gray-500">
                          {count > 1 ? `Session ${i + 1}` : 'Session'}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setStatus(key, 'present')}
                            className={`text-xs px-3 py-1 rounded-md border font-medium ${
                              status === 'present'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'border-gray-300 text-gray-600 hover:bg-white'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => setStatus(key, 'absent')}
                            className={`text-xs px-3 py-1 rounded-md border font-medium ${
                              status === 'absent'
                                ? 'bg-red-500 text-white border-red-500'
                                : 'border-gray-300 text-gray-600 hover:bg-white'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {message && (
        <p
          className={`text-xs mt-4 ${
            message.type === 'success' ? 'text-emerald-600' : 'text-red-500'
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save day'}
      </button>
    </div>
  )
}