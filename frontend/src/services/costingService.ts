import api from './api';

const C = '/costing';

export const costingAPI = {
  list:        ()          => api.get(`${C}/sheets/`),
  get:         (id: number) => api.get(`${C}/sheets/${id}/`),
  create:      (d: any)     => api.post(`${C}/sheets/`, d),
  update:      (id: number, d: any) => api.put(`${C}/sheets/${id}/`, d),
  delete:      (id: number) => api.delete(`${C}/sheets/${id}/`),
  recalculate: (id: number) => api.post(`${C}/sheets/${id}/recalculate/`),
  snapshot:    (id: number) => api.post(`${C}/sheets/${id}/save_version/`),
  versions:    (id: number) => api.get(`${C}/sheets/${id}/versions/`),
  exportCSV:   (id: number) => api.get(`${C}/sheets/${id}/export_csv/`, { responseType: 'blob' }),
  exportJSON:  (id: number) => api.get(`${C}/sheets/${id}/export_json/`),
};

export const lineItemAPI = {
  list:   ()          => api.get(`${C}/line-items/`),
  create: (d: any)     => api.post(`${C}/line-items/`, d),
  update: (id: number, d: any) => api.put(`${C}/line-items/${id}/`, d),
  delete: (id: number) => api.delete(`${C}/line-items/${id}/`),
};

export const scenarioAPI = {
  list:       (sheetId: number) => api.get(`${C}/scenarios/`, { params: { costing_sheet: sheetId } }),
  get:        (id: number) => api.get(`${C}/scenarios/${id}/`),
  create:     (sheetId: number, d: any) => api.post(`${C}/scenarios/`, { ...d, costing_sheet: sheetId }),
  update:     (id: number, d: any) => api.put(`${C}/scenarios/${id}/`, d),
  delete:     (sheetId: number, id: number) => api.delete(`${C}/scenarios/${id}/`),
  calculate:  (id: number) => api.post(`${C}/scenarios/${id}/calculate/`),
};
