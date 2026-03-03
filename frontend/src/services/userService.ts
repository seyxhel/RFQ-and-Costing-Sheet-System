import api from './api';

const U = '/accounts/users';
const A = '/accounts';

export const userAPI = {
  list:   ()          => api.get(`${U}/`),
  get:    (id: number) => api.get(`${U}/${id}/`),
  create: (d: any)     => api.post(`${U}/`, d),
  update: (id: number, d: any) => api.put(`${U}/${id}/`, d),
  delete: (id: number) => api.delete(`${U}/${id}/`),
};

export const auditLogAPI = {
  list: (params?: any) => api.get(`${A}/audit-logs/`, { params }),
  get:  (id: number)   => api.get(`${A}/audit-logs/${id}/`),
};

export const reportAPI = {
  project: (params: any) => api.get(`${A}/reports/project/`, { params }),
};
