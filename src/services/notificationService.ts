import { api } from './api';
import { mapBackendNotificationToFrontend } from './transformers';
import type { Notification } from '../types';

export async function fetchNotificationsApi(limit = 50): Promise<Notification[]> {
  const response = await api.get('/notifications', { params: { limit } });
  return (response.data || []).map(mapBackendNotificationToFrontend);
}

export async function markNotificationReadApi(notificationId: string): Promise<Notification> {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  return mapBackendNotificationToFrontend(response.data);
}

export async function markAllNotificationsReadApi(): Promise<void> {
  await api.patch('/notifications/read-all');
}
