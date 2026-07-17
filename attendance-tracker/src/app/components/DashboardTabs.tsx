'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SubjectsPanel from './SubjectsPanel'
import TodayPanel from './TodayPanel'
import AnalyticsPanel from './AnalyticsPanel'
import HistoryPanel from './HistoryPanel'

const TABS = ['Today', 'Subjects', 'Analytics', 'History'] as const
type Tab = (typeof TABS)[number]

export default function DashboardTabs() {
  const supabase = createClient()
  const [active, setActive] = useState<Tab | null>(null)

  useEffect(() => {
    async function decideStartTab() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setActive('Today')
        return
      }
      const { data } = await supabase
        .from('subjects')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      setActive(data && data.length > 0 ? 'Today' : 'Subjects')
    }
    decideStartTab()
  }, [])

  if (active === null) {
    return <p className="text-sm text-gray-400">Loading...</p>
  }

  return (
    <div>
      <div className="flex gap-1 bg-white border border-gray-100 shadow-sm rounded-xl p-1 mb-6 w-full sm:w-fit overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-md transition whitespace-nowrap ${
              active === tab
                ? 'bg-white text-indigo-600 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 min-h-[300px] shadow-sm">
        {active === 'Today' && <TodayPanel />}
        {active === 'Subjects' && <SubjectsPanel />}
        {active === 'Analytics' && <AnalyticsPanel />}
        {active === 'History' && <HistoryPanel />}
      </div>
    </div>
  )
}