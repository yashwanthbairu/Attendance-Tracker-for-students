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
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
              {profile?.name?.[0]?.toUpperCase() ?? 'S'}
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900 leading-tight">
                {profile?.name ?? 'Student'}
              </h1>
              <p className="text-xs text-gray-500">Roll no: {profile?.roll_number}</p>
            </div>
          </div>
          <LogoutButton />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Overall %</p>
            <p
              className={`text-2xl font-semibold mt-1 ${
                overallPct >= 75 ? 'text-emerald-600' : overallPct > 0 ? 'text-red-500' : 'text-gray-300'
              }`}
            >
              {totalClasses ? `${overallPct}%` : '—'}
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Total classes</p>
            <p className="text-2xl font-semibold text-indigo-600 mt-1">
              {totalClasses || '—'}
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Subjects</p>
            <p className="text-2xl font-semibold text-violet-600 mt-1">
              {subjects?.length || '—'}
            </p>
          </div>
        </div>

        <DashboardTabs />
      </div>
    </div>
  )
}