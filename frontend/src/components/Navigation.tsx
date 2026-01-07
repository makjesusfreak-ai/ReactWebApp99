'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navigation: React.FC = () => {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navItems = [
    { href: '/', label: 'Data Management', shortLabel: 'Data', icon: '📊' },
    { href: '/visualization', label: 'Visualization', shortLabel: 'Charts', icon: '📈' },
  ];

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16 gap-2">
          <div className="flex items-center flex-shrink-0">
            <span className={`font-bold text-gray-800 ${isMobile ? 'text-base' : 'text-xl'}`}>
              🏥 {isMobile ? 'Tracker' : 'Ailment Tracker'}
            </span>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-4 flex-shrink">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 text-xs sm:text-base ${
                  pathname === item.href
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span className="whitespace-nowrap">{isMobile ? item.shortLabel : item.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center flex-shrink-0">
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              {isMobile ? (
                <span className="sr-only">Real-time sync enabled</span>
              ) : (
                <span className="whitespace-nowrap">Real-time sync enabled</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
