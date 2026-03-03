import api from './api';

const B = '/budget';

export const budgetAPI = {
  list:        (params?: any)       => api.get(`${B}/budgets/`, { params }),
  get:         (id: number)         => api.get(`${B}/budgets/${id}/`),
  create:      (d: any)             => api.post(`${B}/budgets/`, d),
  update:      (id: number, d: any) => api.put(`${B}/budgets/${id}/`, d),
  delete:      (id: number)         => api.delete(`${B}/budgets/${id}/`),
  submit:      (id: number)         => api.post(`${B}/budgets/${id}/submit/`),
  approve:     (id: number)         => api.post(`${B}/budgets/${id}/approve/`),
  reject:      (id: number, d: any) => api.post(`${B}/budgets/${id}/reject/`, d),
  close:       (id: number)         => api.post(`${B}/budgets/${id}/close/`),
  recalculate: (id: number)         => api.post(`${B}/budgets/${id}/recalculate/`),
};
