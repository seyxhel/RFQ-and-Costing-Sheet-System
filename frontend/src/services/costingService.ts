import api from './api';

const C = '/costing';

export const costingAPI = {
  list:         ()          => api.get(`${C}/sheets/`),
  get:          (id: number) => api.get(`${C}/sheets/${id}/`),
  create:       (d: any)     => api.post(`${C}/sheets/`, d),
  update:       (id: number, d: any) => api.put(`${C}/sheets/${id}/`, d),
  delete:       (id: number) => api.delete(`${C}/sheets/${id}/`),
  recalculate:  (id: number) => api.post(`${C}/sheets/${id}/recalculate/`),
  submit:       (id: number) => api.post(`${C}/sheets/${id}/submit/`),
  approve:      (id: number) => api.post(`${C}/sheets/${id}/approve/`),
  snapshot:     (id: number, d?: any) => api.post(`${C}/sheets/${id}/save_version/`, d),
  versions:     (id: number) => api.get(`${C}/sheets/${id}/versions/`),
  // Margin level
  getMargin:    (id: number, label: string) => api.get(`${C}/sheets/${id}/margin/${label}/`),
  updateMargin: (id: number, label: string, d: any) => api.put(`${C}/sheets/${id}/margin/${label}/`, d),
  updateCommissionSplits: (id: number, label: string, d: any) =>
    api.put(`${C}/sheets/${id}/margin/${label}/commission-splits/`, d),
};

export const lineItemAPI = {
  list:   (params?: any) => api.get(`${C}/line-items/`, { params }),
  create: (d: any)       => api.post(`${C}/line-items/`, d),
  update: (id: number, d: any) => api.put(`${C}/line-items/${id}/`, d),
  delete: (id: number)   => api.delete(`${C}/line-items/${id}/`),
};

export const costCategoryAPI = {
  list:   ()          => api.get(`${C}/cost-categories/`),
  get:    (id: number) => api.get(`${C}/cost-categories/${id}/`),
  create: (d: any)     => api.post(`${C}/cost-categories/`, d),
  update: (id: number, d: any) => api.put(`${C}/cost-categories/${id}/`, d),
  delete: (id: number) => api.delete(`${C}/cost-categories/${id}/`),
};

export const commissionRoleAPI = {
  list:   ()          => api.get(`${C}/commission-roles/`),
  get:    (id: number) => api.get(`${C}/commission-roles/${id}/`),
  create: (d: any)     => api.post(`${C}/commission-roles/`, d),
  update: (id: number, d: any) => api.put(`${C}/commission-roles/${id}/`, d),
  delete: (id: number) => api.delete(`${C}/commission-roles/${id}/`),
};

export const scenarioAPI = {
  list:       (sheetId: number) => api.get(`${C}/scenarios/`, { params: { costing_sheet: sheetId } }),
  get:        (id: number) => api.get(`${C}/scenarios/${id}/`),
  create:     (sheetId: number, d: any) => api.post(`${C}/scenarios/`, { ...d, costing_sheet: sheetId }),
  update:     (id: number, d: any) => api.put(`${C}/scenarios/${id}/`, d),
  delete:     (sheetId: number, id: number) => api.delete(`${C}/scenarios/${id}/`),
  calculate:  (id: number) => api.post(`${C}/scenarios/${id}/calculate/`),
};
