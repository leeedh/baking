import React from 'react';
import { Mail, Globe, MapPin, Award } from 'lucide-react';

export default function Footer() {
  return (
    <footer id="platform-footer" className="bg-[#2A211B] text-[#FAF4EA]/80 py-12 px-6 mt-auto border-t-4 border-[#B65538]">
      <div id="footer-container" className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl font-bold tracking-tight text-[#FAF4EA]">
              Atelier Crème
            </span>
            <span className="text-[10px] bg-[#B0863C] text-[#2A211B] px-1.5 py-0.5 rounded font-sans font-bold">VOD STUDIO</span>
          </div>
          <p className="text-sm font-light leading-relaxed max-w-md text-[#FAF4EA]/70">
            글로벌 디저트 아티스트의 한정판 제과 테크닉을 HD 고화질 VOD로 평생 소장하세요. 한 번의 구매로 서울, 타이베이, 글로벌 마스터 파티시에의 오리지널 레시피와 핵심 노하우를 기간 제한 없이 반복 학습할 수 있습니다.
          </p>
          <div className="flex items-center gap-3 text-xs text-[#FAF4EA]/50 py-2">
            <span className="flex items-center gap-1"><Globe size={12} /> 한국어 & 繁體中文 지원</span>
            <span>•</span>
            <span className="flex items-center gap-1"><MapPin size={12} /> 서울 성수 & 타이베이 신이 지구</span>
          </div>
        </div>

        <div>
          <h4 className="font-serif text-lg font-bold text-[#B0863C] mb-4">수강 혜택</h4>
          <ul className="space-y-2 text-xs font-light text-[#FAF4EA]/70">
            <li>• 평생 소장 VOD (수강 기한 무제한)</li>
            <li>• PDF 오리지널 배합표 & 피드백 노트</li>
            <li>• 대만/국내 정밀 자막 완벽 매핑</li>
            <li>• 모바일 및 태블릿 최적화 플레이어</li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-lg font-bold text-[#B65538] mb-4">고객지원</h4>
          <ul className="space-y-2 text-xs font-light text-[#FAF4EA]/70">
            <li className="flex items-center gap-1"><Mail size={12} /> support@ateliercreme.com</li>
            <li>• 평일 10:00 - 18:00 (공휴일 제외)</li>
            <li>• 파트너십/제휴 문의</li>
            <li className="text-[10px] text-[#FAF4EA]/40 mt-4 leading-normal">
              © 2026 Atelier Crème Inc. All rights reserved. <br />
              Atelier Crème is a premium educational brand powered by Antigravity.
            </li>
          </ul>
        </div>

      </div>
    </footer>
  );
}
