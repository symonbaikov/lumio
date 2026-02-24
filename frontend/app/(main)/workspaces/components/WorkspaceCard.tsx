'use client';

import { api } from '@/app/lib/api';
import { Star } from 'lucide-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';

interface WorkspaceCardProps {
  workspace: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    backgroundImage: string | null;
    isFavorite?: boolean;
  };
  onClick: () => void;
  onFavoriteToggle?: () => void;
}

export function WorkspaceCard({ workspace, onClick, onFavoriteToggle }: WorkspaceCardProps) {
  const [isFavorite, setIsFavorite] = useState(workspace.isFavorite || false);
  const [isHovered, setIsHovered] = useState(false);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await api.patch(`/workspaces/${workspace.id}/favorite`);
      setIsFavorite(response.data.isFavorite);
      if (onFavoriteToggle) {
        onFavoriteToggle();
      }
    } catch (error: any) {
      toast.error('Failed to update favorite status');
    }
  };

  const isExternalBackground = Boolean(
    workspace.backgroundImage &&
      (workspace.backgroundImage.startsWith('http://') ||
        workspace.backgroundImage.startsWith('https://') ||
        workspace.backgroundImage.startsWith('/')),
  );

  const backgroundImage = workspace.backgroundImage
    ? isExternalBackground
      ? workspace.backgroundImage
      : `/workspace-backgrounds/${workspace.backgroundImage}`
    : '/workspace-backgrounds/vidar-nordli-mathisen-641pLhGEEyg-unsplash.jpg';

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative cursor-pointer rounded-lg overflow-hidden aspect-video hover:shadow-xl transition-all duration-300 text-left"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />

      {/* Darkening Overlay */}
      <div
        className={`absolute inset-0 transition-all duration-500 ${isHovered ? 'bg-black/60 backdrop-blur-[2px]' : 'bg-black/20'}`}
      />

      {/* Static Content (Visible by default) */}
      <div
        className={`absolute inset-0 flex flex-col justify-end p-4 transition-opacity duration-300 ${isHovered ? 'opacity-40' : 'opacity-100'}`}
      >
        <h3 className="text-lg font-bold text-white drop-shadow-md truncate">{workspace.name}</h3>
      </div>

      {/* Animated Description (Slides in on hover) */}
      <div className="absolute inset-0 flex items-center p-6 pointer-events-none">
        <div
          className={`transition-all duration-500 transform ease-out max-w-[80%] ${
            isHovered ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
          }`}
        >
          <p className="text-white text-sm font-medium leading-relaxed drop-shadow-lg italic">
            {workspace.description || 'No description provided'}
          </p>
        </div>
      </div>

      {/* Star Button (Top Right) */}
      <button
        onClick={handleFavoriteClick}
        className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 ${
          isHovered || isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } ${
          isFavorite
            ? 'bg-yellow-500 text-white'
            : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
        }`}
      >
        <Star size={18} className={isFavorite ? 'fill-current' : ''} />
      </button>
    </button>
  );
}
