import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Search, Eye, Pencil, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, Plus, Package } from 'lucide-react';
import { productAPI, categoryAPI } from '../../services/productService';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 10;

export default function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    Promise.all([
      productAPI.list(),
      categoryAPI.list(),
    ]).then(([pRes, cRes]) => {
      setProducts(pRes.data.results || pRes.data);
      setCategories(cRes.data.results || cRes.data);
      setLoading(false);
    }).catch(() => { toast.error('Failed to load products'); setLoading(false); });
  }, []);

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const openMenu = useCallback((id: number) => {
    const btn = btnRefs.current[id];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 140 });
    }
    setOpenMenuId((prev) => (prev === id ? null : id));
  }, []);

  const handleDelete = (id: number) => {
    productAPI.delete(id).then(() => {
      setProducts((p) => p.filter((r) => r.id !== id));
      toast.success('Product deleted');
    }).catch(() => toast.error('Failed to delete'));
    setOpenMenuId(null);
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    const matchCategory = !filterCategory || String(p.category) === filterCategory;
    return matchSearch && matchCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Catalog</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage products and items for RFQ & procurement</p>
        </div>
        <div className="flex gap-3">
          <GreenButton variant="outline" onClick={() => navigate('/products/categories')}>Categories</GreenButton>
          <GreenButton onClick={() => navigate('/products/new')}><Plus className="w-4 h-4 mr-2" /> New Product</GreenButton>
        </div>
      </div>

      <Card accent>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} type="text" placeholder="Search by name, SKU, or description..." className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3BC25B]" />
          </div>
          <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#3BC25B]">
            <option value="">All Categories</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto overflow-y-visible relative">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold">SKU</th>
                <th className="px-6 py-4 font-semibold">Product Name</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">RFQ</th>
                <th className="px-6 py-4 font-semibold">Supplier</th>
                <th className="px-6 py-4 font-semibold">Unit</th>
                <th className="px-6 py-4 font-semibold">Est. Cost</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                  <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  No products found.
                </td></tr>
              ) : paged.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-[#0E8F79] dark:text-green-400 text-xs">{product.sku}</span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{product.name}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">{product.category_name || '—'}</td>
                  <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{product.rfq_number || '—'}</td>
                  <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{product.supplier_name || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{product.unit}</td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {product.estimated_unit_cost ? `₱${Number(product.estimated_unit_cost).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={product.is_active ? 'active' : 'inactive'} /></td>
                  <td className="px-6 py-4 text-right">
                    <button ref={(el) => { btnRefs.current[product.id] = el; }} onClick={(e) => { e.stopPropagation(); openMenu(product.id); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-[#3BC25B] hover:text-white text-gray-600 dark:text-gray-400 disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-[#3BC25B] text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-[#3BC25B] hover:text-white text-gray-600 dark:text-gray-400 disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </Card>

      {/* Context Menu Portal */}
      {openMenuId !== null && ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }} className="w-36 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { navigate(`/products/${openMenuId}/edit`); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Pencil className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => handleDelete(openMenuId)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}
