'use client';

import { CircularProgress } from '@mui/material';
import React from 'react';

interface LoadingAnimationProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 40, // Small spinner
  md: 60, // Medium spinner
  lg: 80, // Large spinner
  xl: 100, // Extra large spinner
};

/**
 * Loading animation component using MUI CircularProgress
 */
export default function LoadingAnimation({ size = 'md', className = '' }: LoadingAnimationProps) {
  const spinnerSize = sizeMap[size];

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <CircularProgress size={spinnerSize} />
    </div>
  );
}
