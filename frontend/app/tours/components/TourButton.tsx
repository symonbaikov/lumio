/**
 * Tour trigger button component
 */

'use client';

import { Button } from '@mui/material';
import { PlayCircle } from 'lucide-react';
import { useTour } from '../../hooks/useTour';

interface TourButtonProps {
  tourId: string;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  label?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function TourButton({
  tourId,
  variant = 'outlined',
  size = 'small',
  label = 'Show tour',
  icon = <PlayCircle size={16} />,
  disabled = false,
  className = '',
}: TourButtonProps) {
  const { startTour, isActive, isCompleted } = useTour(tourId);

  const handleClick = () => {
    if (!isActive) {
      startTour();
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || isActive}
      startIcon={icon}
      className={className}
      sx={{
        textTransform: 'none',
        fontWeight: 500,
      }}
    >
      {isCompleted ? 'Repeat tour' : label}
    </Button>
  );
}
