
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Search, Users, RefreshCw, Database, GraduationCap, CheckCircle2, TrendingUp, Filter, MapPin, Globe, BarChart3, Info, BookOpen
} from 'lucide-react';
import { fetchSusiData } from './services/dataService';
import { SusiData } from './types';
import { StatsCard } from './components/StatsCard';

// 색상 정의 (Beautiful Theme)
const COLORS = {
  original: '#3b82f6', // Blue 500 (최초 합격)
  additional: '#10b981', // Emerald 500 (충원 합격)
  fail: '#ef4444', // Red 500 (불합격)
  other: '#94a3b8', // Slate 400 (진행중/기타)
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [data, setData] = useState<SusiData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [univFilter, setUnivFilter] = useState('All');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'ed2267ne') {
      setIsLoggedIn(true);
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSusiData();
      setData(result);
    } catch (err) {
      setError("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) loadData();
  }, [isLoggedIn]);

  // 결과 판별 헬퍼 함수
  const isOriginalPass = (result: string) => result === '합격';
  const isAdditionalPass = (result: string) => result.includes('충원');
  const isTotalPass = (result: string) => (result.includes('합격') && !result.includes('불'));
  const isFail = (result: string) => result.includes('불합격');

  // 필터링된 데이터 계산 (대학, 학과, 학생명 통합 검색)
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return data.filter(item => {
      const matchesSearch = 
        item.university.toLowerCase().includes(term) || 
        item.major.toLowerCase().includes(term) ||
        item.studentName.toLowerCase().includes(term);
      
      const matchesUniv = univFilter === 'All' || item.university === univFilter;
      return matchesSearch && matchesUniv;
    });
  }, [data, searchTerm, univFilter]);

  // 전체 통계 (글로벌 대시보드용)
  const stats = useMemo(() => {
    if (data.length === 0) return {
      totalApps: 0, passCount: 0, passRate: 0, avgGrade: 0,
      seoulCounts: [], daejeonCounts: [], otherCounts: [], resultDistribution: [],
      admissionTypeStats: [], maxAdmissionTotal: 0
    };

    const totalApps = data.length;
    const passCount = data.filter(d => isTotalPass(d.result)).length;
    const passRate = (passCount / totalApps) * 100;
    const validGrades = data.filter(d => d.grade > 0);
    const avgGrade = validGrades.reduce((sum, d) => sum + d.grade, 0) / (validGrades.length || 1);

    // 지역별 통계
    const getRegionalStats = (filterFn: (d: SusiData) => boolean) => {
      const univStats: Record<string, { name: string, original: number, additional: number, fail: number, other: number, total: number }> = {};
      data.filter(filterFn).forEach(d => {
        if (!univStats[d.university]) {
          univStats[d.university] = { name: d.university, original: 0, additional: 0, fail: 0, other: 0, total: 0 };
        }
        univStats[d.university].total += 1;
        if (isOriginalPass(d.result)) univStats[d.university].original += 1;
        else if (isAdditionalPass(d.result)) univStats[d.university].additional += 1;
        else if (isFail(d.result)) univStats[d.university].fail += 1;
        else univStats[d.university].other += 1;
      });
      return Object.values(univStats).sort((a, b) => b.total - a.total).slice(0, 10);
    };

    const seoulCounts = getRegionalStats(d => d.region.includes('서울'));
    const daejeonCounts = getRegionalStats(d => d.region.includes('대전'));
    const otherCounts = getRegionalStats(d => !d.region.includes('서울') && !d.region.includes('대전'));

    // 전형별 통계 (교과, 학종, 실기, 논술)
    const admMap: Record<string, { original: number, additional: number, fail: number, total: number }> = {
      '교과': { original: 0, additional: 0, fail: 0, total: 0 },
      '학종': { original: 0, additional: 0, fail: 0, total: 0 },
      '실기': { original: 0, additional: 0, fail: 0, total: 0 },
      '논술': { original: 0, additional: 0, fail: 0, total: 0 },
    };

    data.forEach(d => {
      let cat = '';
      const type = d.admissionType;
      if (type.includes('교과')) cat = '교과';
      else if (type.includes('종합') || type.includes('학종')) cat = '학종';
      else if (type.includes('실기')) cat = '실기';
      else if (type.includes('논술')) cat = '논술';

      if (cat) {
        admMap[cat].total += 1;
        if (isOriginalPass(d.result)) admMap[cat].original += 1;
        else if (isAdditionalPass(d.result)) admMap[cat].additional += 1;
        else if (isFail(d.result)) admMap[cat].fail += 1;
      }
    });

    const admissionTypeStats = Object.entries(admMap).map(([name, s]) => ({
      name,
      total: s.total,
      original: s.original,
      additional: s.additional,
      fail: s.fail,
      passRate: s.total > 0 ? ((s.original + s.additional) / s.total * 100).toFixed(1) : '0.0'
    })).filter(s => s.total > 0);

    const maxAdmissionTotal = Math.max(...admissionTypeStats.map(s => s.total), 1);

    return { totalApps, passCount, passRate, avgGrade, seoulCounts, daejeonCounts, otherCounts, admissionTypeStats, maxAdmissionTotal };
  }, [data]);

  // 필터링된 데이터 기반의 내신 등급별 분포 통계
  const filteredGradeStats = useMemo(() => {
    if (filteredData.length === 0) return { gradeStats: [], maxGradeTotal: 0 };

    const gradeMap: Record<number, { original: number, additional: number, fail: number, total: number }> = {};
    for (let i = 1; i <= 9; i++) gradeMap[i] = { original: 0, additional: 0, fail: 0, total: 0 };
    
    filteredData.forEach(d => {
      if (d.grade > 0) {
        const g = Math.floor(d.grade);
        if (g >= 1 && g <= 9) {
          gradeMap[g].total += 1;
          if (isOriginalPass(d.result)) gradeMap[g].original += 1;
          else if (isAdditionalPass(d.result)) gradeMap[g].additional += 1;
          else if (isFail(d.result)) gradeMap[g].fail += 1;
        }
      }
    });

    let maxGradeTotal = 0;
    const gradeStats = Object.entries(gradeMap)
      .map(([grade, s]) => {
        if (s.total > maxGradeTotal) maxGradeTotal = s.total;
        return {
          grade: `${grade}등급대`,
          passRate: s.total > 0 ? ((s.original + s.additional) / s.total * 100).toFixed(1) : '0.0',
          original: s.original,
          additional: s.additional,
          fail: s.fail,
          total: s.total
        };
      })
      .filter(s => s.total > 0);

    return { gradeStats, maxGradeTotal };
  }, [filteredData]);

  const uniqueUnivs = useMemo(() => ['All', ...Array.from(new Set(data.map(d => d.university)))].sort(), [data]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-200">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl mb-6 shadow-xl shadow-blue-200 rotate-3">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">2026 수시 지원 분석</h1>
            <p className="text-slate-500 mt-3 font-medium">관리자 인증이 필요합니다.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Passcode</label>
              <input 
                type="password"
                autoFocus
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-center tracking-[0.5em] text-2xl font-black text-slate-800"
                placeholder="••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-200 active:scale-95 text-lg">
              로그인
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderRegionalChart = (title: string, chartData: any[], icon: React.ReactNode) => (
    <div className="bg-white p-5 rounded-[2rem] shadow-lg shadow-slate-200/40 border border-slate-100 h-full flex flex-col">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight leading-none">{title}</h3>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">Top 10 Rankings</p>
        </div>
      </div>
      <div className="flex-1 min-h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: -25, right: 10, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              width={120} 
              tick={{fontSize: 10, fontWeight: 700, fill: '#334155'}} 
            />
            <Tooltip 
              cursor={{fill: '#f8fafc'}}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px -4px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '10px' }}
            />
            <Bar dataKey="original" name="최초합격" stackId="a" fill={COLORS.original} barSize={16} />
            <Bar dataKey="additional" name="충원합격" stackId="a" fill={COLORS.additional} />
            <Bar dataKey="fail" name="불합격" stackId="a" fill={COLORS.fail} />
            <Bar dataKey="other" name="기타" stackId="a" fill={COLORS.other} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tighter leading-none">2026 수시 대시보드</h1>
            </div>
          </div>
          <button onClick={loadData} className="group flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm">
            <RefreshCw className={`w-3 h-3 group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
            동기화
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 mt-6 space-y-6">
        {/* 요약 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="총 지원 건수" value={`${stats.totalApps}건`} icon={<Users className="w-5 h-5 text-blue-600" />} color="bg-blue-50" />
          <StatsCard title="전체 합격 수" value={`${stats.passCount}건`} icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} color="bg-emerald-50" />
          <StatsCard title="최종 합격률" value={`${stats.passRate.toFixed(1)}%`} icon={<TrendingUp className="w-5 h-5 text-rose-600" />} color="bg-rose-50" />
          <StatsCard title="내신 평균" value={`${stats.avgGrade.toFixed(2)}`} icon={<GraduationCap className="w-5 h-5 text-indigo-600" />} color="bg-indigo-50" />
        </div>

        {/* 메인 차트 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {renderRegionalChart('서울 TOP 10', stats.seoulCounts, <MapPin className="w-4 h-4" />)}
          {renderRegionalChart('대전 TOP 10', stats.daejeonCounts, <MapPin className="w-4 h-4" />)}
          {renderRegionalChart('기타 TOP 10', stats.otherCounts, <Globe className="w-4 h-4" />)}
          
          <div className="bg-white p-5 rounded-[2rem] shadow-lg shadow-slate-200/40 border border-slate-100 flex flex-col h-full">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight leading-none">전형별 합격 현황</h3>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">Status by Admission Type</p>
              </div>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto px-1">
              {stats.admissionTypeStats.map((item, idx) => {
                const barWidth = (item.total / stats.maxAdmissionTotal) * 100;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-700">{item.name}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[8px] font-bold text-slate-300 uppercase">Pass Rate</span>
                        <span className="text-[11px] font-black text-indigo-600">{item.passRate}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div style={{ width: `${barWidth}%` }} className="h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                        {/* Order: 최초합격 -> 충원합격 -> 불합격 */}
                        <div className="h-full transition-all duration-500" style={{ width: `${(item.original / item.total) * 100}%`, backgroundColor: COLORS.original }} />
                        <div className="h-full transition-all duration-500" style={{ width: `${(item.additional / item.total) * 100}%`, backgroundColor: COLORS.additional }} />
                        <div className="h-full transition-all duration-500" style={{ width: `${(item.fail / item.total) * 100}%`, backgroundColor: COLORS.fail }} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{item.total}건</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 flex flex-wrap justify-between gap-2">
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></div> <span className="text-[8px] font-bold text-slate-400">최초합격</span></div>
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div> <span className="text-[8px] font-bold text-slate-400">충원합격</span></div>
              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></div> <span className="text-[8px] font-bold text-slate-400">불합격</span></div>
            </div>
          </div>
        </div>

        {/* 상세 지원 기록 & 내신 등급별 분포 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          
          {/* 내신 등급별 분포 (1/3 영역) - 검색 결과 기반으로 실시간 변동 */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/30 border border-slate-100 h-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">내신 등급별 분포</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Filtered Results by Grade</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-6">
              {filteredGradeStats.gradeStats.length === 0 ? (
                <div className="py-10 text-center text-slate-300 text-xs font-bold uppercase tracking-widest">데이터 없음</div>
              ) : (
                filteredGradeStats.gradeStats.map((item, idx) => {
                  const barContainerWidth = filteredGradeStats.maxGradeTotal > 0 ? (item.total / filteredGradeStats.maxGradeTotal) * 100 : 0;
                  
                  return (
                    <div key={idx} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg">{item.grade}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[9px] font-bold text-slate-300 uppercase">Pass Rate</span>
                          <span className="text-sm font-black text-indigo-600">{item.passRate}%</span>
                        </div>
                      </div>
                      
                      <div className="mb-2" style={{ width: `${barContainerWidth}%`, minWidth: '10%' }}>
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                          {/* Order: 최초합격 -> 충원합격 -> 불합격 */}
                          <div className="h-full transition-all duration-500" style={{ width: `${(item.original / item.total) * 100}%`, backgroundColor: COLORS.original }} />
                          <div className="h-full transition-all duration-500" style={{ width: `${(item.additional / item.total) * 100}%`, backgroundColor: COLORS.additional }} />
                          <div className="h-full transition-all duration-500" style={{ width: `${(item.fail / item.total) * 100}%`, backgroundColor: COLORS.fail }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.original }}></span> <span className="text-slate-500">{item.original}</span></div>
                          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.additional }}></span> <span className="text-slate-500">{item.additional}</span></div>
                          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.fail }}></span> <span className="text-slate-500">{item.fail}</span></div>
                        </div>
                        <span className="text-slate-300">총 {item.total}건</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 상세 테이블 (2/3 영역) */}
          <div className="xl:col-span-2 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/30 border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">상세 지원 기록</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">대학, 학과, 이름으로 검색 가능합니다.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative group">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="대학, 학과 또는 학생명..." 
                    className="pl-9 pr-10 py-2 bg-slate-50 border border-transparent rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-all w-[260px]" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-transparent hover:border-slate-200 transition-all">
                  <Filter className="w-3 h-3 text-slate-400" />
                  <select 
                    className="bg-transparent border-none text-[11px] font-black text-slate-600 outline-none cursor-pointer" 
                    value={univFilter} 
                    onChange={(e) => setUnivFilter(e.target.value)}
                  >
                    {uniqueUnivs.map(u => <option key={u} value={u}>{u === 'All' ? '전체 대학' : u}</option>)}
                  </select>
                </div>
              </div>
            </div>
            
            {/* 검색 안내 팁 */}
            <div className="bg-blue-50/30 px-8 py-2 border-b border-slate-50 flex items-center gap-2 text-[10px] text-blue-500 font-bold">
              <Info className="w-3 h-3" />
              <span>현재 {filteredData.length.toLocaleString()}개의 결과가 표시되고 있습니다.</span>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
                  <tr>
                    <th className="px-8 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">학생</th>
                    <th className="px-8 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">대학(지역)</th>
                    <th className="px-8 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">전형 / 학과</th>
                    <th className="px-8 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">내신</th>
                    <th className="px-8 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">결과</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.slice(0, 100).map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-50/60 transition-colors">
                      <td className="px-8 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                            {item.studentName.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-800 text-xs group-hover:text-blue-700 transition-colors">{item.studentName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-xs">{item.university}</span>
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">{item.region}</span>
                        </div>
                      </td>
                      <td className="px-8 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter leading-none mb-0.5">{item.admissionType}</span>
                          <span className="text-[11px] font-bold text-slate-600 truncate max-w-[140px]">{item.major}</span>
                        </div>
                      </td>
                      <td className="px-8 py-3.5 text-center">
                        <span className="text-xs font-black text-slate-900 bg-slate-100/50 px-2 py-0.5 rounded-md">{item.grade > 0 ? item.grade.toFixed(2) : '-'}</span>
                      </td>
                      <td className="px-8 py-3.5 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black shadow-sm ${
                          isOriginalPass(item.result) ? 'bg-blue-600 text-white' : 
                          isAdditionalPass(item.result) ? 'bg-emerald-500 text-white' :
                          isFail(item.result) ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {item.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredData.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
                  <Search className="w-12 h-12 opacity-20" />
                  <div className="text-center">
                    <p className="font-black text-sm">검색 결과가 없습니다.</p>
                    <p className="text-[10px] mt-1">다른 키워드로 검색해 보세요.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
