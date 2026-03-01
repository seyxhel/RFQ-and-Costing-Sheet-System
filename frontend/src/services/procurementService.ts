import api from './api';

const PR = '/procurement';

export const purchaseOrderAPI = {
  list:            (params?: any)       => api.get(`${PR}/purchase-orders/`, { params }),
  get:             (id: number)         => api.get(`${PR}/purchase-orders/${id}/`),
  create:          (d: any)             => api.post(`${PR}/purchase-orders/`, d),
  update:          (id: number, d: any) => api.put(`${PR}/purchase-orders/${id}/`, d),
  delete:          (id: number)         => api.delete(`${PR}/purchase-orders/${id}/`),
  issue:           (id: number)         => api.post(`${PR}/purchase-orders/${id}/issue/`),
  complete:        (id: number)         => api.post(`${PR}/purchase-orders/${id}/complete/`),
  varianceSummary: ()                   => api.get(`${PR}/purchase-orders/variance_summary/`),
};

export const actualCostAPI = {
  list:   (params?: any)       => api.get(`${PR}/actual-costs/`, { params }),
  get:    (id: number)         => api.get(`${PR}/actual-costs/${id}/`),
  create: (d: any)             => api.post(`${PR}/actual-costs/`, d),
  update: (id: number, d: any) => api.put(`${PR}/actual-costs/${id}/`, d),
  delete: (id: number)         => api.delete(`${PR}/actual-costs/${id}/`),
};
