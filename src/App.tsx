import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import LoginScreen from './components/LoginScreen';
import CatalogScreen from './components/CatalogScreen';
import DetailScreen from './components/DetailScreen';
import PaymentScreen from './components/PaymentScreen';
import PlayerScreen from './components/PlayerScreen';
import MyClassesScreen from './components/MyClassesScreen';
import DashboardScreen from './components/DashboardScreen';
import BooksScreen from './components/BooksScreen';
import InstructorScreen from './components/InstructorScreen';

import { ClassItem } from './types';
import { CLASSES_DATA } from './data';
import { Layers, Sparkles, Navigation, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Global React States
  const [classesList, setClassesList] = useState<ClassItem[]>(CLASSES_DATA);
  const [currentView, setCurrentView] = useState<'catalog' | 'detail' | 'player' | 'payment' | 'myclasses' | 'dashboard' | 'login' | 'books' | 'instructor'>('catalog');
  
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [userEmail, setUserEmail] = useState('ldhl4468@gmail.com'); // Pre-filled with user metadata for immediate premium experience
  
  const [selectedClassId, setSelectedClassId] = useState<string | null>('class-macarons');
  const [purchasedClassIds, setPurchasedClassIds] = useState<string[]>(['class-cookies']); // pre-own cookies so "My Classes" screen isn't empty on load
  const [initialLessonId, setInitialLessonId] = useState<string | null>(null);

  // Callback to propagate new mock classes from operator dashboard
  const handleAddNewMockClass = (newClass: ClassItem) => {
    setClassesList(prev => [newClass, ...prev]);
  };

  // Simulating live statistics refresh on operator dashboard
  const handleRefreshStats = () => {
    alert('운영 서버 자원이 원격으로 갱신되었습니다. 대만 및 전국 가맹점 결제 데이터가 정상 동기화되었습니다.');
  };

  // Switch views cleanly with parameter guards
  const handleNavigate = (view: any, classId: string | null = null) => {
    if (view === 'player' || view === 'payment' || view === 'detail') {
      if (classId) {
        setSelectedClassId(classId);
      } else if (!selectedClassId) {
        // Fallback to macaron class if no selected class ID is set
        setSelectedClassId('class-macarons');
      }
    }
    setCurrentView(view);
    setInitialLessonId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);
    setCurrentView('catalog');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
    setCurrentView('catalog');
  };

  // Start previewing 1st lesson immediately
  const handleStartPreview = (classId: string, lessonId: string) => {
    setSelectedClassId(classId);
    setInitialLessonId(lessonId);
    setCurrentView('player');
  };

  const handlePurchaseNavigation = (classId: string) => {
    if (!isLoggedIn) {
      alert('결제 및 수강 지정을 완료하려면 먼저 로그인을 완료해 주셔야 합니다.');
      setCurrentView('login');
      return;
    }
    setSelectedClassId(classId);
    setCurrentView('payment');
  };

  const handlePaymentSuccess = (classId: string) => {
    if (!purchasedClassIds.includes(classId)) {
      setPurchasedClassIds(prev => [...prev, classId]);
    }
    setCurrentView('myclasses');
    alert('🎉 정식 평생소장 라이선스 계약이 완료되었습니다! 내 클래스 보관함에서 평생 기한 없이 반복 수강하실 수 있습니다.');
  };

  const handleResumeClass = (classId: string) => {
    setSelectedClassId(classId);
    setInitialLessonId(null);
    setCurrentView('player');
  };

  // Determine current active class object for Detail / Player / Payment
  const activeClass = classesList.find(c => c.id === selectedClassId) || classesList[0];

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF4EA] text-[#2A211B] font-sans">
      
      {/* Editorial Platform Header */}
      <Header 
        currentView={currentView}
        onNavigate={handleNavigate}
        isLoggedIn={isLoggedIn}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      {/* Main Core Render Stage */}
      <main className="flex-grow pb-24">
        {currentView === 'login' && (
          <LoginScreen 
            onLoginSuccess={handleLoginSuccess}
            onNavigateToCatalog={() => handleNavigate('catalog')}
          />
        )}

        {currentView === 'catalog' && (
          <CatalogScreen 
            classes={classesList}
            onSelectClass={(id) => handleNavigate('detail', id)}
            onNavigateToDetail={(id) => handleNavigate('detail', id)}
            onNavigateToInstructor={() => handleNavigate('instructor')}
            onNavigateToBooks={() => handleNavigate('books')}
          />
        )}

        {currentView === 'detail' && activeClass && (
          <DetailScreen 
            cls={activeClass}
            purchased={purchasedClassIds.includes(activeClass.id)}
            onNavigateToCatalog={() => handleNavigate('catalog')}
            onNavigateToPayment={handlePurchaseNavigation}
            onStartPreview={handleStartPreview}
          />
        )}

        {currentView === 'payment' && activeClass && (
          <PaymentScreen 
            cls={activeClass}
            userEmail={userEmail}
            onPaymentSuccess={handlePaymentSuccess}
            onNavigateBack={() => handleNavigate('detail', activeClass.id)}
          />
        )}

        {currentView === 'player' && activeClass && (
          <PlayerScreen 
            cls={activeClass}
            purchased={purchasedClassIds.includes(activeClass.id)}
            onNavigateBack={() => handleNavigate('detail', activeClass.id)}
            initialLessonId={initialLessonId}
          />
        )}

        {currentView === 'myclasses' && (
          <MyClassesScreen 
            purchasedClasses={classesList.filter(c => purchasedClassIds.includes(c.id))}
            onNavigateToCatalog={() => handleNavigate('catalog')}
            onResumeClass={handleResumeClass}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardScreen 
            onAddNewMockClass={handleAddNewMockClass}
            onRefreshStats={handleRefreshStats}
          />
        )}

        {currentView === 'books' && (
          <BooksScreen />
        )}

        {currentView === 'instructor' && (
          <InstructorScreen 
            onNavigateToCatalog={() => handleNavigate('catalog')}
            onNavigateToBooks={() => handleNavigate('books')}
          />
        )}
      </main>



      {/* Shared Footer Area */}
      <Footer />

    </div>
  );
}
