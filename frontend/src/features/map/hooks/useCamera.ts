import { useState } from 'react';
import { WORLD_WIDTH, WORLD_HEIGHT, Vec2, CameraState } from '../types';

interface UseCameraResult {
  camera: CameraState;
  zoom: number;
  setViewport: (width: number, height: number) => void;
  setZoom: (zoom: number, avatarPos: Vec2) => void;
  centerOnAvatar: (avatarPos: Vec2) => void;
  pan: (deltaX: number, deltaY: number) => void;
  isFollowing: boolean;
  setIsFollowing: (following: boolean) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// Helper: center camera on avatar position
export function centerCameraOnAvatar(
  avatarPos: Vec2,
  camera: CameraState,
  zoom: number
): CameraState {
  const halfWidth = camera.width / (2 * zoom);
  const halfHeight = camera.height / (2 * zoom);

  let x = avatarPos.x - halfWidth;
  let y = avatarPos.y - halfHeight;

  // Clamp to world bounds
  const visibleWidth = camera.width / zoom;
  const visibleHeight = camera.height / zoom;
  x = Math.max(0, Math.min(x, WORLD_WIDTH - visibleWidth));
  y = Math.max(0, Math.min(y, WORLD_HEIGHT - visibleHeight));

  return { ...camera, x, y };
}

export const useCamera = (
  initialViewport: { width: number; height: number },
  initialZoom: number = 1
): UseCameraResult => {
  // Početna pozicija kamere - na vrhu mape (y = 0), centrirano horizontalno
  // Centriramo kameru tako da mapa bude u centru viewport-a
  const visibleWidth = initialViewport.width / initialZoom;
  const initialX = Math.max(0, (WORLD_WIDTH - visibleWidth) / 2);
  const [camera, setCamera] = useState<CameraState>({
    x: initialX,
    y: 0, // Počinje na vrhu
    width: initialViewport.width,
    height: initialViewport.height,
  });
  const [zoom, setZoomState] = useState(initialZoom);
  const [isFollowing, setIsFollowing] = useState(true);

  const setViewport = (width: number, height: number) => {
    setCamera((prev) => ({
      ...prev,
      width,
      height,
    }));
  };

  const setZoom = (newZoom: number, avatarPos: Vec2) => {
    const clampedZoom = clamp(newZoom, 0.7, 1.4);
    setZoomState(clampedZoom);
    setCamera((prev) => centerCameraOnAvatar(avatarPos, prev, clampedZoom));
  };

  const centerOnAvatar = (avatarPos: Vec2) => {
    setCamera((prev) => centerCameraOnAvatar(avatarPos, prev, zoom));
  };

  const pan = (deltaX: number, deltaY: number) => {
    setCamera((prev) => {
      const visibleWidth = prev.width / zoom;
      const visibleHeight = prev.height / zoom;
      return {
        ...prev,
        x: clamp(prev.x - deltaX / zoom, 0, Math.max(0, WORLD_WIDTH - visibleWidth)),
        y: clamp(prev.y - deltaY / zoom, 0, Math.max(0, WORLD_HEIGHT - visibleHeight)),
      };
    });
    setIsFollowing(false);
  };

  return { camera, zoom, setViewport, setZoom, centerOnAvatar, pan, isFollowing, setIsFollowing };
};

