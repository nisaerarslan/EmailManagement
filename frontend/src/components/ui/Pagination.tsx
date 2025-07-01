import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';
import { cn } from '../../lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  // Tek sayfa varsa da gösterilecek basit görünüm
  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-center px-3 py-1.5 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            disabled={true}
            className="h-7 w-7 p-0 rounded-md opacity-50 cursor-not-allowed"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            className="h-7 w-7 p-0 rounded-md shadow-sm ring-1 ring-blue-400 dark:ring-blue-600"
          >
            1
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            disabled={true}
            className="h-7 w-7 p-0 rounded-md opacity-50 cursor-not-allowed"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  const renderPageNumbers = () => {
    const pages = [];
    
    // Sadece mevcut sayfa ve yanındaki sayfaları göster
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, currentPage + 1);
    
    // Sayfa numaralarını oluştur
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={`page-${i}`}
          variant={currentPage === i ? "primary" : "outline"}
          size="sm"
          onClick={() => onPageChange(i)}
          className={cn(
            "h-7 w-7 p-0 rounded-md text-xs font-medium transition-colors",
            currentPage === i 
              ? "shadow-sm ring-1 ring-blue-400 dark:ring-blue-600" 
              : "hover:bg-gray-100 dark:hover:bg-gray-700"
          )}
        >
          {i}
        </Button>
      );
    }
    
    return pages;
  };
  
  return (
    <div className="flex items-center justify-center px-3 py-1.5 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-7 w-7 p-0 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Önceki Sayfa"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        
        <div className="flex items-center space-x-1">
          {renderPageNumbers()}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-7 w-7 p-0 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Sonraki Sayfa"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
} 