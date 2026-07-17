'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type SubjectStat = {
  id: string
  name: string
  type: 'theory' | 'lab'
  total: number
  present: number
}

type SubjectRecord = {
  date: string
  day_name: string
  session_number: number
  status: 'present' | 'absent'
}

export default function AnalyticsPanel() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SubjectStat[]>([])
  const [totalAll, setTotalAll] = useState(0)
  const [presentAll, setPresentAll] = useState(0)

  const [selectedSubject, setSelectedSubject] = useState<SubjectStat | null>(null)
  const [records, setRecords] = useState<SubjectRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name, type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      const { data: days } = await supabase
        .from('attendance_days')
        .select('id')
        .eq('user_id', user.id)

      const dayIds = (days ?? []).map((d) => d.id)

      let entries: { subject_id: string; status: string }[] = []
      if (dayIds.length > 0) {
        const { data } = await supabase
          .from('day_entries')
          .select('subject_id, status')
          .in('attendance_day_id', dayIds)
        entries = data ?? []
      }

      const statMap: Record<string, SubjectStat> = {}
      ;(subjects ?? []).forEach((s) => {
        statMap[s.id] = { id: s.id, name: s.name, type: s.type, total: 0, present: 0 }
      })

      let total = 0
      let present = 0
      entries.forEach((e) => {
        if (!statMap[e.subject_id]) return
        statMap[e.subject_id].total++
        total++
        if (e.status === 'present') {
          statMap[e.subject_id].present++
          present++
        }
      })

      setStats(Object.values(statMap))
      setTotalAll(total)
      setPresentAll(present)
      setLoading(false)
    }
    load()
  }, [])

  async function openSubject(subject: SubjectStat) {
    setSelectedSubject(subject)
    setRecordsLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: days } = await supabase
      .from('attendance_days')
      .select('id, date, day_name')
      .eq('user_id', user.id)

    const dayMap: Record<string, { date: string; day_name: string }> = {}
    ;(days ?? []).forEach((d) => (dayMap[d.id] = { date: d.date, day_name: d.day_name }))

    const dayIds = Object.keys(dayMap)
    let entries: {
      attendance_day_id: string
      session_number: number
      status: 'present' | 'absent'
    }[] = []

    if (dayIds.length > 0) {
      const { data } = await supabase
        .from('day_entries')
        .select('attendance_day_id, session_number, status')
        .eq('subject_id', subject.id)
        .in('attendance_day_id', dayIds)
      entries = data ?? []
    }

    const rows: SubjectRecord[] = entries.map((e) => ({
      date: dayMap[e.attendance_day_id]?.date ?? '',
      day_name: dayMap[e.attendance_day_id]?.day_name ?? '',
      session_number: e.session_number,
      status: e.status,
    }))

    rows.sort((a, b) => b.date.localeCompare(a.date) || a.session_number - b.session_number)

    setRecords(rows)
    setRecordsLoading(false)
  }

  function closeModal() {
    setSelectedSubject(null)
    setRecords([])
  }

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>

  const overallPct = totalAll ? Math.round((presentAll / totalAll) * 1000) / 10 : 0
  const absent = totalAll - presentAll

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500">Overall</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">{overallPct}%</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500">Present</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">{presentAll}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500">Absent</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">{absent}</p>
        </div>
      </div>

      {stats.length === 0 ? (
        <p className="text-sm text-gray-400">No data yet — log a day to see analytics.</p>
      ) : (
        <>
          <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-4">
            Click on each subject to see detailed analysis.
          </p>
          <div className="space-y-4">
            {stats.map((s) => {
              const pct = s.total ? Math.round((s.present / s.total) * 1000) / 10 : 0
              const low = pct < 75
              return (
                <button
                  key={s.id}
                  onClick={() => openSubject(s)}
                  className="w-full text-left hover:bg-gray-50 rounded-lg p-2 -m-2 transition"
                >
                  <div className="flex items-center justify-between mb-1">
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
                    <span className={`text-sm font-medium ${low ? 'text-red-500' : 'text-emerald-600'}`}>
                      {pct}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-1">
                    {s.present}/{s.total} classes
                  </p>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${low ? 'bg-red-400' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {selectedSubject && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-3 sm:p-4 z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-lg max-w-md w-full max-h-[85vh] overflow-y-auto p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">{selectedSubject.name}</h3>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    selectedSubject.type === 'lab'
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {selectedSubject.type}
                </span>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 text-sm">
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              {selectedSubject.present}/{selectedSubject.total} classes attended (
              {selectedSubject.total
                ? Math.round((selectedSubject.present / selectedSubject.total) * 1000) / 10
                : 0}
              %)
            </p>

            {recordsLoading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : records.length === 0 ? (
              <p className="text-sm text-gray-400">No records for this subject yet.</p>
            ) : (
              <div className="space-y-2">
                {records.map((r, i) => {
                  const sameDateCount = records.filter((x) => x.date === r.date).length
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <span className="text-xs text-gray-600">
                        {r.day_name}, {r.date}
                        {sameDateCount > 1 ? ` (session ${r.session_number})` : ''}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          r.status === 'present' ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {r.status === 'present' ? 'Present' : 'Absent'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}