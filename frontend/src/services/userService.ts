import api from './api';

const U = '/accounts/users';

export const userAPI = {
  list:   ()          => api.get(`${U}/`),
  get:    (id: number) => api.get(`${U}/${id}/`),
  create: (d: any)     => api.post(`${U}/`, d),
  update: (id: number, d: any) => api.put(`${U}/${id}/`, d),
  delete: (id: number) => api.delete(`${U}/${id}/`),
};
