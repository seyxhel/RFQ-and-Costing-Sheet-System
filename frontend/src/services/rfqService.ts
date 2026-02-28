import api from './api';

const R = '/rfq';

export const rfqAPI = {
  list:   ()          => api.get(`${R}/rfqs/`),
  get:    (id: number) => api.get(`${R}/rfqs/${id}/`),
  create: (d: any)     => api.post(`${R}/rfqs/`, d),
  update: (id: number, d: any) => api.put(`${R}/rfqs/${id}/`, d),
  delete: (id: number) => api.delete(`${R}/rfqs/${id}/`),
  submit: (id: number) => api.post(`${R}/rfqs/${id}/submit/`),
  approve:(id: number, d: any) => api.post(`${R}/rfqs/${id}/approve/`, d),
  compare:(id: number) => api.get(`${R}/rfqs/${id}/compare/`),
};

export const supplierAPI = {
  list:   ()          => api.get(`${R}/suppliers/`),
  get:    (id: number) => api.get(`${R}/suppliers/${id}/`),
  create: (d: any)     => api.post(`${R}/suppliers/`, d),
  update: (id: number, d: any) => api.put(`${R}/suppliers/${id}/`, d),
  delete: (id: number) => api.delete(`${R}/suppliers/${id}/`),
};

export const quotationAPI = {
  list:   ()          => api.get(`${R}/quotations/`),
  get:    (id: number) => api.get(`${R}/quotations/${id}/`),
  create: (d: any)     => api.post(`${R}/quotations/`, d),
  update: (id: number, d: any) => api.put(`${R}/quotations/${id}/`, d),
  delete: (id: number) => api.delete(`${R}/quotations/${id}/`),
  accept: (id: number) => api.post(`${R}/quotations/${id}/accept/`),
  reject: (id: number) => api.post(`${R}/quotations/${id}/reject/`),
};
