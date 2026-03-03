import api from './api';

const S = '/sales';

export const formalQuotationAPI = {
  list:   (params?: any)       => api.get(`${S}/quotations/`, { params }),
  get:    (id: number)         => api.get(`${S}/quotations/${id}/`),
  create: (d: any)             => api.post(`${S}/quotations/`, d),
  update: (id: number, d: any) => api.put(`${S}/quotations/${id}/`, d),
  delete: (id: number)         => api.delete(`${S}/quotations/${id}/`),
  send:   (id: number)         => api.post(`${S}/quotations/${id}/send/`),
  accept: (id: number)         => api.post(`${S}/quotations/${id}/accept/`),
  reject: (id: number)         => api.post(`${S}/quotations/${id}/reject/`),
};

export const salesOrderAPI = {
  list:    (params?: any)       => api.get(`${S}/orders/`, { params }),
  get:     (id: number)         => api.get(`${S}/orders/${id}/`),
  create:  (d: any)             => api.post(`${S}/orders/`, d),
  update:  (id: number, d: any) => api.put(`${S}/orders/${id}/`, d),
  delete:  (id: number)         => api.delete(`${S}/orders/${id}/`),
  confirm: (id: number)         => api.post(`${S}/orders/${id}/confirm/`),
  start:   (id: number)         => api.post(`${S}/orders/${id}/start/`),
  complete:(id: number)         => api.post(`${S}/orders/${id}/complete/`),
};

export const contractAnalysisAPI = {
  list:        (params?: any)       => api.get(`${S}/contract-analyses/`, { params }),
  get:         (id: number)         => api.get(`${S}/contract-analyses/${id}/`),
  create:      (d: any)             => api.post(`${S}/contract-analyses/`, d),
  update:      (id: number, d: any) => api.put(`${S}/contract-analyses/${id}/`, d),
  delete:      (id: number)         => api.delete(`${S}/contract-analyses/${id}/`),
  recalculate: (id: number)         => api.post(`${S}/contract-analyses/${id}/recalculate/`),
};
