'use client'

import { useState } from 'react'
import SubjectsPanel from './SubjectsPanel'
import TodayPanel from './TodayPanel'
import AnalyticsPanel from './AnalyticsPanel'
import HistoryPanel from './HistoryPanel'

const TABS = ['Today', 'Subjects', 'Analytics', 'History'] as const
type Tab = (typeof TABS)[number]

export default function DashboardTabs() {
    const [active, setActive] = useState<Tab>('Today')

  return (
    <div>
      <div className="flex gap-1 bg-white border border-gray-100 shadow-sm rounded-xl p-1 mb-6 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-4 py-1.5 text-sm rounded-md transition ${
              active === tab
                ? 'bg-white text-indigo-600 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 min-h-[300px] shadow-sm">
        {active === 'Subjects' && <SubjectsPanel />}
        {active === 'Today' && <TodayPanel />}
        {active === 'Analytics' && <AnalyticsPanel />}
        {active === 'History' && <HistoryPanel />}
      </div>
    </div>
  )
}