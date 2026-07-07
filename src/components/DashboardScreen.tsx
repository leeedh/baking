import React, { useState } from 'react';
import { ClassManagementItem, KPIStats } from '../types';
import { KPI_DASHBOARD_DATA, CLASS_MANAGEMENT_DATA } from '../data';
import { TrendingUp, Users, Target, GraduationCap, Coins, Settings, Plus, LayoutGrid, FileSpreadsheet, Sparkles, Filter } from 'lucide-react';

interface DashboardScreenProps {
  onAddNewMockClass: (newClass: any) => void;
  onRefreshStats: () => void;
}

export default function DashboardScreen({ onAddNewMockClass, onRefreshStats }: DashboardScreenProps) {
  const [stats, setStats] = useState<KPIStats>(KPI_DASHBOARD_DATA);
  const [classList, setClassList] = useState<ClassManagementItem[]>(CLASS_MANAGEMENT_DATA);
  
  // States for interactive custom pricing modifier
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);

  // States for adding a new mock class
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('제철 딸기 포레누아 컵케이크 클래스');
  const [newInstructor, setNewInstructor] = useState('사토 유이 (Yui Sato)');
  const [newPrice, setNewPrice] = useState(128000);

  const startEditPrice = (cls: ClassManagementItem) => {
    setEditingClassId(cls.id);
    setEditingPrice(cls.price);
  };

  const savePriceEdit = (id: string) => {
    setClassList(classList.map(item => {
      if (item.id === id) {
        return { 
          ...item, 
          price: editingPrice,
          revenue: item.salesCount * editingPrice // recalculate revenue
        };
      }
      return item;
    }));
    setEditingClassId(null);
    alert('클래스 판매가가 성공적으로 업데이트되었습니다.');
  };

  const handleCreateMockClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newInstructor || !newPrice) {
      alert('모든 필드를 입력해 주세요.');
      return;
    }

    const mockId = `mock-${Date.now()}`;
    const newClassManagement: ClassManagementItem = {
      id: mockId,
      title: newTitle,
      instructor: newInstructor,
      price: Number(newPrice),
      salesCount: 1,
      revenue: Number(newPrice),
      completionRate: 0
    };

    setClassList([newClassManagement, ...classList]);
    
    // Propagate up to simulated DB
    onAddNewMockClass({
      id: mockId,
      title: newTitle,
      instructor: newInstructor,
      instructorTitle: '동경 제과 아카데미 졸업 수석 파티시에',
      description: '단 하루 만에 완성하는 제철 과일 보존법부터 컵케이크 젤라틴 비결 레시피.',
      price: Number(newPrice),
      originalPrice: Number(newPrice) * 1.5,
      rating: 5.0,
      reviewCount: 1,
      thumbnail: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&q=80&w=800',
      category: '모던 타르트',
      level: '초급',
      duration: '총 8차시 (4시간 30분)',
      studentsCount: 15,
      tags: ['컵케이크', '딸기 포레누아', '초보자']
    });

    setShowAddModal(false);
    alert('새 클래스가 카탈로그 및 시청 목록에 긴급 배포되었습니다!');
  };

  return (
    <div id="dashboard-screen" className="bg-[#FAF4EA] py-10 px-4 sm:px-8 max-w-7xl mx-auto">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <span className="text-xs font-bold text-[#B0863C] tracking-wider uppercase block">ADMIN SYSTEM</span>
          <h1 className="font-serif text-3xl font-bold text-[#2A211B] flex items-center gap-2">
            운영자 모드 대시보드
            <span className="text-xs font-sans text-[#B65538] bg-[#B65538]/10 px-2 py-0.5 rounded font-bold">LIVE METRIC</span>
          </h1>
          <p className="text-xs text-[#5F4E43] mt-1">대만 및 국내 수강권 매출, 가입 전환 및 완주 인덱스 요약 정보입니다.</p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            id="btn-simulate-refresh"
            onClick={onRefreshStats}
            className="px-4 py-2 bg-white text-xs font-semibold text-[#5F4E43] rounded-lg border border-[#EFE8DC] hover:text-[#B65538] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            설비 데이터 갱신
          </button>
          
          <button
            id="btn-show-add-class"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#B65538] hover:bg-[#A14328] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
          >
            <Plus size={14} /> 새 클래스 편성등록
          </button>
        </div>
      </div>

      {/* KPI METRICS (총 4개 카드: 매출, 수강생, 구매전환율, 완주율) */}
      <div id="kpi-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        
        {/* KPI 1: Sales Revenue */}
        <div className="bg-white rounded-xl border border-[#EFE8DC] p-5 space-y-3 shadow-sm transform hover:translate-y-[-2px] transition-transform">
          <div className="flex justify-between items-center text-[#5F4E43]">
            <span className="text-xs font-bold uppercase tracking-wider">클래스 당월 유효 매출</span>
            <span className="text-[#B65538] p-1.5 bg-[#B65538]/10 rounded-lg">
              <Coins size={16} />
            </span>
          </div>
          <div>
            <span className="text-2xl font-serif font-extrabold text-[#2A211B]">₩{stats.salesTotal.toLocaleString()}</span>
            <p className="text-[10px] text-emerald-600 font-bold mt-1">{stats.salesGrowth}</p>
          </div>
        </div>

        {/* KPI 2: Students */}
        <div className="bg-white rounded-xl border border-[#EFE8DC] p-5 space-y-3 shadow-sm transform hover:translate-y-[-2px] transition-transform">
          <div className="flex justify-between items-center text-[#5F4E43]">
            <span className="text-xs font-bold uppercase tracking-wider">누적 수강생 가입권</span>
            <span className="text-[#B0863C] p-1.5 bg-[#B0863C]/10 rounded-lg">
              <Users size={16} />
            </span>
          </div>
          <div>
            <span className="text-2xl font-serif font-extrabold text-[#2A211B]">{stats.studentsTotal.toLocaleString()} 명</span>
            <p className="text-[10px] text-emerald-600 font-bold mt-1">{stats.studentsGrowth}</p>
          </div>
        </div>

        {/* KPI 3: Conversion Rate */}
        <div className="bg-white rounded-xl border border-[#EFE8DC] p-5 space-y-3 shadow-sm transform hover:translate-y-[-2px] transition-transform">
          <div className="flex justify-between items-center text-[#5F4E43]">
            <span className="text-xs font-bold uppercase tracking-wider">방문자 평균 구매 전환율</span>
            <span className="text-sky-700 p-1.5 bg-sky-50 rounded-lg">
              <Target size={16} />
            </span>
          </div>
          <div>
            <span className="text-2xl font-serif font-extrabold text-[#2A211B]">{stats.conversionRate.toFixed(2)} %</span>
            <p className="text-[10px] text-emerald-600 font-bold mt-1">{stats.conversionGrowth}</p>
          </div>
        </div>

        {/* KPI 4: Completion Rate */}
        <div className="bg-white rounded-xl border border-[#EFE8DC] p-5 space-y-3 shadow-sm transform hover:translate-y-[-2px] transition-transform">
          <div className="flex justify-between items-center text-[#5F4E43]">
            <span className="text-xs font-bold uppercase tracking-wider">평균 수강 완주율</span>
            <span className="text-emerald-700 p-1.5 bg-emerald-50 rounded-lg">
              <GraduationCap size={16} />
            </span>
          </div>
          <div>
            <span className="text-2xl font-serif font-extrabold text-[#2A211B]">{stats.completionRate.toFixed(1)} %</span>
            <p className="text-[10px] text-emerald-600 font-bold mt-1">{stats.completionGrowth}</p>
          </div>
        </div>

      </div>

      {/* CLASSES MANAGEMENT TABLE */}
      <div className="bg-white rounded-2xl border border-[#EFE8DC] shadow-sm overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-6 bg-[#FAF4EA]/40 border-b border-[#EFE8DC] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-serif text-base font-bold text-[#2A211B]">클래스 상품 판매 실적 관리 데스크</h3>
            <p className="text-[11px] text-[#5F4E43] mt-0.5">실시간으로 VOD 수강권 가격 조율 및 긴급 배포가 허용됩니다.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#5F4E43] flex items-center gap-1">
              <Filter size={13} /> 정렬: 높은 판매액 순
            </span>
          </div>
        </div>

        {/* Real HTML Table */}
        <div className="overflow-x-auto">
          <table id="tbl-baking-classes" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF4EA]/20 border-b border-[#EFE8DC] text-[11px] font-bold text-[#5F4E43] uppercase tracking-wider">
                <th className="py-4 px-6">강의 고유명 / 분류</th>
                <th className="py-4 px-6">배정 셰프</th>
                <th className="py-4 px-6 text-right">정가 금액</th>
                <th className="py-4 px-6 text-right">누적 판매 수량</th>
                <th className="py-4 px-6 text-right">정산 총 매출</th>
                <th className="py-4 px-6 text-center">평균 완주율</th>
                <th className="py-4 px-6 text-right">운영 행동</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DC]/60 text-xs sm:text-sm text-[#2A211B]">
              {classList.map(item => (
                <tr key={item.id} className="hover:bg-[#FAF4EA]/10 transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-bold text-xs block truncate max-w-[250px]">{item.title}</span>
                    <span className="text-[10px] text-[#5F4E43]/60 block mt-1 font-mono">ID: {item.id}</span>
                  </td>
                  
                  <td className="py-4 px-6">
                    <span className="text-xs font-semibold text-[#B65538]">{item.instructor}</span>
                  </td>

                  <td className="py-4 px-6 text-right font-mono font-medium">
                    {editingClassId === item.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          value={editingPrice}
                          onChange={(e) => setEditingPrice(Number(e.target.value))}
                          className="w-20 px-1 py-0.5 border border-[#B65538] text-xs font-bold rounded"
                        />
                        <button 
                          onClick={() => savePriceEdit(item.id)}
                          className="px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] rounded"
                        >
                          저장
                        </button>
                      </div>
                    ) : (
                      <span>₩{item.price.toLocaleString()}</span>
                    )}
                  </td>

                  <td className="py-4 px-6 text-right font-mono text-[#5F4E43]">
                    {item.salesCount.toLocaleString()} Pass
                  </td>

                  <td className="py-4 px-6 text-right font-mono font-bold text-[#B0863C]">
                    ₩{item.revenue.toLocaleString()}
                  </td>

                  <td className="py-4 px-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold text-emerald-700">{item.completionRate}%</span>
                      <div className="w-16 bg-[#FAF4EA] h-1.5 rounded-full overflow-hidden mt-1 border border-[#EFE8DC]">
                        <div 
                          className="bg-emerald-600 h-full rounded-full" 
                          style={{ width: `${item.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    {editingClassId !== item.id && (
                      <button
                        onClick={() => startEditPrice(item)}
                        className="px-2.5 py-1 text-[11px] font-bold text-[#B65538] bg-[#B65538]/10 hover:bg-[#B65538] hover:text-[#FAF4EA] rounded transition-all cursor-pointer"
                      >
                        단가 조정
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* COMPONENT 7 ADD MODAL DESIGN OVERLAY */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#EFE8DC] p-6 space-y-4 shadow-2xl relative">
            
            <div className="border-b border-[#FAF4EA] pb-2">
              <h3 className="font-serif text-lg font-bold text-[#2A211B] flex items-center gap-1">
                <Sparkles size={18} className="text-[#B0863C]" /> 새 클래스 편성등록 에이전트
              </h3>
              <p className="text-[10px] text-[#5F4E43] mt-0.5">커뮤니티 카탈로그 및 비디오 목록에 즉시 편입되는 라이브 기능입니다.</p>
            </div>

            <form onSubmit={handleCreateMockClass} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#5F4E43] uppercase mb-1">강의 명칭</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EFE8DC] rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#B65538] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#5F4E43] uppercase mb-1">담당 파티시에(셰프)</label>
                <input
                  type="text"
                  value={newInstructor}
                  onChange={(e) => setNewInstructor(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EFE8DC] rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#B65538] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#5F4E43] uppercase mb-1">출시 가격 (KRW ₩)</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#EFE8DC] rounded-lg text-xs font-mono font-medium focus:ring-1 focus:ring-[#B65538] focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-[#FAF4EA] border border-[#EFE8DC] text-xs font-semibold rounded-lg text-[#5F4E43] hover:bg-[#FAF4EA]/80 transition-colors cursor-pointer"
                >
                  편성 기각
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#B65538] text-white text-xs font-bold rounded-lg hover:bg-[#A14328] transition-colors cursor-pointer"
                >
                  클래스 신규 배포
                </button>
              </div>
            </form>
            
          </div>
        </div>
      )}

    </div>
  );
}
