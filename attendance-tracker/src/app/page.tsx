import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './components/LogoutButton'
import DashboardTabs from './components/DashboardTabs'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id')
    .eq('user_id', user.id)

  const { data: days } = await supabase
    .from('attendance_days')
    .select('id')
    .eq('user_id', user.id)

  const dayIds = (days ?? []).map((d) => d.id)
  let totalClasses = 0
  let presentCount = 0

  if (dayIds.length > 0) {
    const { data: entries } = await supabase
      .from('day_entries')
      .select('status')
      .in('attendance_day_id', dayIds)

    totalClasses = entries?.length ?? 0
    presentCount = entries?.filter((e) => e.status === 'present').length ?? 0
  }

  const overallPct = totalClasses ? Math.round((presentCount / totalClasses) * 1000) / 10 : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
              {profile?.name?.[0]?.toUpperCase() ?? 'S'}
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-gray-900 leading-tight truncate">
                {profile?.name ?? 'Student'}
              </h1>
              <p className="text-xs text-gray-500 truncate">Roll no: {profile?.roll_number}</p>
            </div>
          </div>
          <LogoutButton />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
          <div className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4 shadow-sm">
            <p className="text-[11px] sm:text-xs text-gray-500">Overall %</p>
            <p
              className={`text-lg sm:text-2xl font-semibold mt-1 ${
                overallPct >= 75 ? 'text-emerald-600' : overallPct > 0 ? 'text-red-500' : 'text-gray-300'
              }`}
            >
              {totalClasses ? `${overallPct}%` : '—'}
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4 shadow-sm">
            <p className="text-[11px] sm:text-xs text-gray-500">Total classes</p>
            <p className="text-lg sm:text-2xl font-semibold text-indigo-600 mt-1">
              {totalClasses || '—'}
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4 shadow-sm">
            <p className="text-[11px] sm:text-xs text-gray-500">Subjects</p>
            <p className="text-lg sm:text-2xl font-semibold text-violet-600 mt-1">
              {subjects?.length || '—'}
            </p>
          </div>
        </div>

        <DashboardTabs />
      </div>
    </div>
  )
}