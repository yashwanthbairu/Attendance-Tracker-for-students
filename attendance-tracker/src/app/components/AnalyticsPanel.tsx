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

export default function AnalyticsPanel() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SubjectStat[]>([])
  const [totalAll, setTotalAll] = useState(0)
  const [presentAll, setPresentAll] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name, type')
        .eq('user_id', user.id)

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

      {stats.length === 0 && (
        <p className="text-sm text-gray-400">No data yet — log a day to see analytics.</p>
      )}

      <div className="space-y-4">
        {stats.map((s) => {
          const pct = s.total ? Math.round((s.present / s.total) * 1000) / 10 : 0
          const low = pct < 75
          return (
            <div key={s.id}>
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
            </div>
          )
        })}
      </div>
    </div>
  )
}