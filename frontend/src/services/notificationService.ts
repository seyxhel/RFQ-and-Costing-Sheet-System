import api from './api';

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  reference_id: string;
  reference_url: string;
  is_read: boolean;
  sender: number | null;
  sender_name: string;
  created_at: string;
}

export interface NotificationListResponse {
  unread_count: number;
  results: Notification[];
}

const BASE = '/notifications';

export const notificationAPI = {
  list: () => api.get<NotificationListResponse>(BASE + '/'),

  markRead: (ids: number[]) => api.post(BASE + '/mark-read/', { ids }),

  markAllRead: () => api.post(BASE + '/mark-all-read/'),

  delete: (id: number) => api.delete(`${BASE}/${id}/`),

  clearAll: () => api.delete(BASE + '/clear/'),

  send: (data: {
    notification_type: string;
    title: string;
    message?: string;
    reference_id?: string;
    reference_url?: string;
    recipients: number[];
  }) => api.post(BASE + '/send/', data),

  sendToRole: (data: {
    role: string;
    notification_type: string;
    title: string;
    message?: string;
    reference_id?: string;
    reference_url?: string;
  }) => api.post(BASE + '/send-to-role/', data),
};
