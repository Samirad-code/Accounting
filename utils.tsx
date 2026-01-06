
import React from 'react';

/**
 * Format currency in Tomans
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fa-IR').format(Math.round(amount)) + ' تومان';
};

/**
 * Format date to Persian/Jalali string
 */
export const formatJalali = (dateStr: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fa-IR').format(date);
};

/**
 * Get color based on stock levels
 */
export const getStockStatusColor = (current: number, threshold: number) => {
  if (current <= 0) return 'text-red-600 dark:text-red-400 font-bold';
  if (current <= threshold) return 'text-orange-500 dark:text-orange-300 font-bold';
  return 'text-green-600 dark:text-green-400';
};

/**
 * Basic PDF simulation
 */
export const exportToPDF = (elementId: string, filename: string) => {
  const originalTitle = document.title;
  document.title = filename;
  window.print();
  document.title = originalTitle;
};
