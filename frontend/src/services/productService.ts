import api from './api';

const P = '/products';

export const categoryAPI = {
  list:   ()                   => api.get(`${P}/categories/`),
  get:    (id: number)         => api.get(`${P}/categories/${id}/`),
  create: (d: any)             => api.post(`${P}/categories/`, d),
  update: (id: number, d: any) => api.put(`${P}/categories/${id}/`, d),
  delete: (id: number)         => api.delete(`${P}/categories/${id}/`),
};

export const productAPI = {
  list:   (params?: any)       => api.get(`${P}/products/`, { params }),
  get:    (id: number)         => api.get(`${P}/products/${id}/`),
  create: (d: any)             => api.post(`${P}/products/`, d),
  update: (id: number, d: any) => api.put(`${P}/products/${id}/`, d),
  delete: (id: number)         => api.delete(`${P}/products/${id}/`),
};
