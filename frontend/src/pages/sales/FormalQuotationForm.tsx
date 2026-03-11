import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formalQuotationAPI } from '../../services/salesService';
import { costingAPI } from '../../services/costingService';
import ClientSelectModal from '../../components/ui/ClientSelectModal';
import { toast } from 'sonner';
import { Save, ArrowLeft, UserSearch, FileSpreadsheet } from 'lucide-react';

interface LineItem {
  item_number: number;
  description: string;
  brand: string;
  model_number: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

interface MarginLevel {
  id: number;
  label: string;
  gross_selling_vat_ex: number;
  vat_amount: number;
  net_selling_vat_inc: number;
}

interface CostingDetail {
  id: number;
  sheet_number: string;
  title: string;
  total_project_cost: number;
  vat_rate: number;
  line_items: { id: number; category_name: string; description: string; amount: string; total_cost: string }[];
  margin_levels: MarginLevel[];
}

const PAYMENT_TERMS = [
  'Cash on Delivery (COD)',
  'Cash Before Delivery (CBD)',
  'Due on Receipt',
  'Net 15',
  'Net 30',
  'Net 60',
  '50% Down, Balance on Delivery',
  'Installments / Milestone Payments',
  'Advance Payment',
  'Post-Dated Check (PDC)',
  'Others',
];

const MARGIN_LABELS: Record<string, string> = { VERY_LOW: 'Very Low', LOW: 'Low', MEDIUM_LOW: 'Medium-Low', MEDIUM_HIGH: 'Medium-High', HIGH: 'High', VERY_HIGH: 'Very High', CUSTOM: 'Custom' };

export default function FormalQuotationForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    client: null as number | null,
    client_name: '', client_designation: '', client_contact_number: '',
    client_address: '', client_contact: '', client_email: '',
    project_title: '', description: '', warranty: '',
    date: new Date().toISOString().slice(0, 10),
    vat_rate: 12, payment_terms: '', delivery_terms: '', validity_days: 30,
    terms_and_conditions: '', notes: '',
    rfq: null as number | null,
    costing_sheet: null as number | null,
    margin_level: null as number | null,
  });
  const [items, setItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [ptSelect, setPtSelect] = useState('');
  const [ptCustom, setPtCustom] = useState('');

  // Costing sheet linking
  const [costingSheets, setCostingSheets] = useState<{ id: number; sheet_number: string; title: string }[]>([]);
  const [costingDetail, setCostingDetail] = useState<CostingDetail | null>(null);
  const [selectedMarginLabel, setSelectedMarginLabel] = useState('');

  // Fetch costing sheets list
  useEffect(() => {
    costingAPI.list().then(r => {
      const list = r.data.results || r.data || [];
      setCostingSheets(list);
    }).catch(() => {});
  }, []);

  // When costing sheet changes, fetch detail
  useEffect(() => {
    if (form.costing_sheet) {
      costingAPI.get(form.costing_sheet).then(({ data }) => {
        setCostingDetail(data);
        // If margin_level is already set (edit mode), find the label
        if (form.margin_level) {
          const ml = data.margin_levels?.find((m: MarginLevel) => m.id === form.margin_level);
          if (ml) setSelectedMarginLabel(ml.label);
        }
      }).catch(() => { setCostingDetail(null); toast.error('Failed to load costing sheet'); });
    } else {
      setCostingDetail(null);
      setSelectedMarginLabel('');
      setItems([]);
      setField('margin_level', null);
    }
  }, [form.costing_sheet]);

  // When margin level selection changes, compute line items
  useEffect(() => {
    if (!costingDetail || !selectedMarginLabel) { setItems([]); return; }
    const ml = costingDetail.margin_levels.find(m => m.label === selectedMarginLabel);
    if (!ml) { setItems([]); return; }

    setField('margin_level', ml.id);
    setField('vat_rate', costingDetail.vat_rate);

    const tpc = Number(costingDetail.total_project_cost) || 1;
    const grossSelling = Number(ml.gross_selling_vat_ex);
    const factor = tpc > 0 ? grossSelling / tpc : 1;

    const newItems: LineItem[] = costingDetail.line_items.map((li, i) => {
      const cost = Number(li.total_cost) || 0;
      const sellingPrice = Math.round(cost * factor * 100) / 100;
      return {
        item_number: i + 1,
        description: li.description ? `${li.category_name} — ${li.description}` : li.category_name,
        brand: '',
        model_number: '',
        quantity: 1,
        unit: 'lot',
        unit_price: sellingPrice,
      };
    });
    setItems(newItems);
  }, [selectedMarginLabel, costingDetail]);

  useEffect(() => {
    if (isEdit) {
      formalQuotationAPI.get(Number(id)).then(({ data }) => {
        setForm({
          client: data.client, client_name: data.client_name,
          client_designation: data.client_designation || '',
          client_contact_number: data.client_contact_number || '',
          client_address: data.client_address,
          client_contact: data.client_contact, client_email: data.client_email,
          project_title: data.project_title, description: data.description,
          warranty: data.warranty, date: data.date, vat_rate: data.vat_rate,
          payment_terms: data.payment_terms, delivery_terms: data.delivery_terms,
          validity_days: data.validity_days, terms_and_conditions: data.terms_and_conditions,
          notes: data.notes, rfq: data.rfq, costing_sheet: data.costing_sheet,
          margin_level: data.margin_level,
        });
        // If no costing sheet linked, load saved items as-is
        if (!data.costing_sheet && data.items?.length) setItems(data.items);
        if (data.payment_terms) {
          if (PAYMENT_TERMS.slice(0, -1).includes(data.payment_terms)) {
            setPtSelect(data.payment_terms);
          } else {
            setPtSelect('Others');
            setPtCustom(data.payment_terms);
          }
        }
      }).catch(() => toast.error('Failed to load quotation'));
    }
  }, [id]);

  const setField = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.costing_sheet || !form.margin_level) {
      toast.error('Please select a costing sheet and margin level');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, items };
      if (isEdit) {
        await formalQuotationAPI.update(Number(id), payload);
        toast.success('Quotation updated');
      } else {
        const { data } = await formalQuotationAPI.create(payload);
        toast.success('Quotation created');
        nav(`/sales/quotations/${data.id}`);
        return;
      }
      nav('/sales/quotations');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const inp = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm";
  const fmt = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <button onClick={() => nav(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit' : 'New'} Formal Quotation</h1>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Client Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Client Information</h2>
            <button type="button" onClick={() => setClientModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#63D44A] to-[#0E8F79] text-white text-sm font-medium rounded-lg hover:opacity-90 transition">
              <UserSearch className="w-4 h-4" /> Select Client
            </button>
          </div>
          {!form.client ? (
            <p className="text-sm text-gray-400 italic py-4 text-center">No client selected. Click "Select Client" to choose or register one.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Client Name</label><div className={inp + ' bg-gray-50 dark:bg-gray-700/50'}>{form.client_name || '—'}</div></div>
              <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Designation</label><div className={inp + ' bg-gray-50 dark:bg-gray-700/50'}>{form.client_designation || '—'}</div></div>
              <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Contact Number</label><div className={inp + ' bg-gray-50 dark:bg-gray-700/50'}>{form.client_contact_number || '—'}</div></div>
              <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Contact Person</label><div className={inp + ' bg-gray-50 dark:bg-gray-700/50'}>{form.client_contact || '—'}</div></div>
              <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label><div className={inp + ' bg-gray-50 dark:bg-gray-700/50'}>{form.client_email || '—'}</div></div>
              <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date</label><input type="date" value={form.date} onChange={e => setField('date', e.target.value)} className={inp} /></div>
              <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Address</label><div className={inp + ' bg-gray-50 dark:bg-gray-700/50 min-h-[2.5rem]'}>{form.client_address || '—'}</div></div>
            </div>
          )}
        </div>

        <ClientSelectModal
          open={clientModalOpen}
          onClose={() => setClientModalOpen(false)}
          onSelect={(c) => {
            setForm(prev => ({
              ...prev,
              client: c.id,
              client_name: c.name,
              client_designation: c.designation,
              client_contact_number: c.contact_number,
              client_contact: c.name,
              client_email: c.email,
              client_address: c.address,
            }));
            setClientModalOpen(false);
          }}
        />

        {/* Project */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Project Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Project Title *</label><input value={form.project_title} onChange={e => setField('project_title', e.target.value)} className={inp} required /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Warranty</label><input value={form.warranty} onChange={e => setField('warranty', e.target.value)} className={inp} /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label><textarea value={form.description} onChange={e => setField('description', e.target.value)} className={inp} rows={2} /></div>
        </div>

        {/* Linked Costing Sheet */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow space-y-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#3BC25B]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Linked Costing Sheet</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Costing Sheet *</label>
              <select
                value={form.costing_sheet ?? ''}
                onChange={e => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setField('costing_sheet', v);
                  setSelectedMarginLabel('');
                }}
                className={inp}
              >
                <option value="">-- Select Costing Sheet --</option>
                {costingSheets.map(cs => (
                  <option key={cs.id} value={cs.id}>{cs.sheet_number} — {cs.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Margin Level *</label>
              <div className="flex flex-wrap gap-2">
                {(costingDetail?.margin_levels || []).map(ml => {
                  const isCustom = ml.label === 'CUSTOM';
                  return (
                  <button
                    key={ml.label}
                    type="button"
                    onClick={() => setSelectedMarginLabel(ml.label)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
                      selectedMarginLabel === ml.label
                        ? isCustom ? 'bg-gradient-to-r from-purple-500 to-purple-700 text-white border-transparent' : 'bg-gradient-to-r from-[#63D44A] to-[#0E8F79] text-white border-transparent'
                        : isCustom ? 'border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {MARGIN_LABELS[ml.label] || ml.label}
                    <span className="block text-xs font-normal mt-0.5 opacity-80">₱{fmt(Number(ml.net_selling_vat_inc))}</span>
                  </button>
                  );
                })}
              </div>
              {!costingDetail && (
                <p className="text-xs text-gray-400 mt-1">Select a costing sheet first</p>
              )}
            </div>
          </div>
        </div>

        {/* Line Items (from costing sheet) */}
        {items.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 dark:text-gray-400 text-xs">
                  <tr>
                    <th className="px-2 py-1 text-left w-8">#</th>
                    <th className="px-2 py-1 text-left">Description</th>
                    <th className="px-2 py-1 text-right w-20">Qty</th>
                    <th className="px-2 py-1 text-left w-16">Unit</th>
                    <th className="px-2 py-1 text-right w-32">Unit Price</th>
                    <th className="px-2 py-1 text-right w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-2 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-2 py-2 text-gray-900 dark:text-white">{it.description}</td>
                      <td className="px-2 py-2 text-right text-gray-900 dark:text-white">{it.quantity}</td>
                      <td className="px-2 py-2 text-gray-600 dark:text-gray-400">{it.unit}</td>
                      <td className="px-2 py-2 text-right font-mono text-gray-900 dark:text-white">₱{fmt(it.unit_price)}</td>
                      <td className="px-2 py-2 text-right font-mono text-gray-900 dark:text-white">₱{fmt(it.quantity * it.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end text-sm space-x-8 pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-gray-500">Subtotal: <strong className="text-gray-900 dark:text-white">₱{fmt(subtotal)}</strong></span>
              <span className="text-gray-500">VAT ({form.vat_rate}%): <strong className="text-gray-900 dark:text-white">₱{fmt(subtotal * form.vat_rate / 100)}</strong></span>
              <span className="text-gray-500">Total: <strong className="text-[#3BC25B] text-base">₱{fmt(subtotal * (1 + form.vat_rate / 100))}</strong></span>
            </div>
          </div>
        )}

        {/* Terms */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Terms</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">VAT Rate (%)</label><input type="number" value={form.vat_rate} onChange={e => setField('vat_rate', +e.target.value)} className={inp} step="0.01" /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Validity (days)</label><input type="number" value={form.validity_days} onChange={e => setField('validity_days', +e.target.value)} className={inp} /></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Payment Terms</label>
            <select
              value={ptSelect}
              onChange={e => {
                const val = e.target.value;
                setPtSelect(val);
                if (val !== 'Others') {
                  setField('payment_terms', val);
                  setPtCustom('');
                } else {
                  setField('payment_terms', '');
                }
              }}
              className={inp}
            >
              <option value="">-- Select Payment Terms --</option>
              {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {ptSelect === 'Others' && (
              <input
                type="text"
                value={ptCustom}
                onChange={e => { setPtCustom(e.target.value); setField('payment_terms', e.target.value); }}
                placeholder="Specify payment terms..."
                className={inp + ' mt-2'}
              />
            )}
          </div>
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Delivery Terms</label><textarea value={form.delivery_terms} onChange={e => setField('delivery_terms', e.target.value)} className={inp} rows={2} /></div>
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Terms & Conditions</label><textarea value={form.terms_and_conditions} onChange={e => setField('terms_and_conditions', e.target.value)} className={inp} rows={3} /></div>
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label><textarea value={form.notes} onChange={e => setField('notes', e.target.value)} className={inp} rows={2} /></div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => nav(-1)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#63D44A] to-[#0E8F79] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
