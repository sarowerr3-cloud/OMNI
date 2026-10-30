'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckSquare, 
  ListChecks, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  RotateCcw, 
  Copy, 
  Printer, 
  Sparkles, 
  Package, 
  Calendar, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Filter, 
  FolderOpen, 
  Share2,
  Layers,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { ChecklistTask, DEFAULT_SOURCING_CHECKLIST, SavedProductList } from './ProductListBuilder';
import { getAuthHeaders } from '@/services/customerApi';

interface SourcingChecklistManagerProps {
  apiUrl?: string;
  showToast: (msg: string) => void;
  onOpenOrderInBuilder?: (order: SavedProductList) => void;
}

export default function SourcingChecklistManager({
  apiUrl = 'http://localhost:8000',
  showToast,
  onOpenOrderInBuilder
}: SourcingChecklistManagerProps) {
  // Checklist State
  const [checklist, setChecklist] = useState<ChecklistTask[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('omni_builder_checklist');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_SOURCING_CHECKLIST;
  });

  const [newTaskText, setNewTaskText] = useState<string>('');
  const [newTaskCategory, setNewTaskCategory] = useState<'sourcing' | 'payment' | 'shipping' | 'delivery' | 'custom'>('custom');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed' | 'sourcing' | 'payment' | 'shipping' | 'delivery'>('all');

  // Multi-Order Checklist Context
  const [savedOrders, setSavedOrders] = useState<SavedProductList[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('active');
  const [activeOrderTitle, setActiveOrderTitle] = useState<string>('Active Working Sourcing Pipeline');
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);

  // Load Saved Orders on mount
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      // Load from local storage first
      const localStored = localStorage.getItem('omni_saved_product_lists');
      let localOrders: SavedProductList[] = [];
      if (localStored) {
        try {
          localOrders = JSON.parse(localStored);
        } catch (e) {}
      }

      // Try fetching from server
      try {
        const res = await fetch(`${apiUrl}/product-lists`, {
          headers: getAuthHeaders(),
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const serverOrders = await res.json();
          if (Array.isArray(serverOrders) && serverOrders.length > 0) {
            setSavedOrders(serverOrders);
            setLoadingOrders(false);
            return;
          }
        }
      } catch (e) {
        // server offline, fallback to local
      }

      setSavedOrders(localOrders);
    } catch (e) {
      console.error('Failed to load orders for checklist:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Sync checklist to localStorage whenever it changes
  useEffect(() => {
    try {
      if (selectedOrderId === 'active') {
        localStorage.setItem('omni_builder_checklist', JSON.stringify(checklist));
      } else {
        // Update order in saved list
        const updated = savedOrders.map((ord) => {
          if (ord.id === selectedOrderId) {
            return { ...ord, checklist };
          }
          return ord;
        });
        setSavedOrders(updated);
        localStorage.setItem('omni_saved_product_lists', JSON.stringify(updated));

        // Try updating backend
        fetch(`${apiUrl}/product-lists/${selectedOrderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ checklist })
        }).catch(() => {});
      }
    } catch (e) {}
  }, [checklist, selectedOrderId]);

  // Handle switching order context
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    if (orderId === 'active') {
      setActiveOrderTitle('Active Working Sourcing Pipeline');
      try {
        const stored = localStorage.getItem('omni_builder_checklist');
        if (stored) {
          setChecklist(JSON.parse(stored));
        } else {
          setChecklist(DEFAULT_SOURCING_CHECKLIST);
        }
      } catch (e) {
        setChecklist(DEFAULT_SOURCING_CHECKLIST);
      }
    } else {
      const found = savedOrders.find((o) => o.id === orderId);
      if (found) {
        setActiveOrderTitle(found.name);
        if (found.checklist && Array.isArray(found.checklist) && found.checklist.length > 0) {
          setChecklist(found.checklist);
        } else {
          setChecklist(DEFAULT_SOURCING_CHECKLIST);
        }
      }
    }
  };

  // Checklist Actions
  const handleToggleTask = (id: string) => {
    setChecklist((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTaskText.trim();
    if (!trimmed) return;

    const newTask: ChecklistTask = {
      id: `task-${Date.now()}`,
      text: trimmed,
      completed: false,
      category: newTaskCategory
    };

    setChecklist((prev) => [...prev, newTask]);
    setNewTaskText('');
    showToast('✓ Task added to checklist');
  };

  const handleDeleteTask = (id: string) => {
    setChecklist((prev) => prev.filter((t) => t.id !== id));
    showToast('Task removed');
  };

  const handleCheckAll = () => {
    setChecklist((prev) => prev.map((t) => ({ ...t, completed: true })));
    showToast('✓ All tasks marked as completed!');
  };

  const handleUncheckAll = () => {
    setChecklist((prev) => prev.map((t) => ({ ...t, completed: false })));
    showToast('Unchecked all tasks');
  };

  const handleResetChecklist = () => {
    if (confirm('Reset checklist back to the 9 default sourcing milestones?')) {
      setChecklist(DEFAULT_SOURCING_CHECKLIST);
      showToast('🔄 Reset to default 9 milestones');
    }
  };

  const handleCopyText = () => {
    const completedCount = checklist.filter((t) => t.completed).length;
    const progress = Math.round((completedCount / (checklist.length || 1)) * 100);

    const lines = [
      `📋 OMNI SOURCING TO-DO CHECKLIST`,
      `📦 Order: ${activeOrderTitle}`,
      `📊 Progress: ${completedCount}/${checklist.length} Completed (${progress}%)`,
      `───────────────────────────────`,
      ...checklist.map((t) => `${t.completed ? '[✓]' : '[ ]'} ${t.text}`),
      `───────────────────────────────`,
      `Generated from OMNI Sourcing Pro Checklist Engine`
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    showToast('📋 Checklist copied to clipboard!');
  };

  const handlePrint = () => {
    window.print();
  };

  // Metrics
  const totalCount = checklist.length;
  const completedCount = checklist.filter((t) => t.completed).length;
  const pendingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered Tasks
  const filteredTasks = checklist.filter((task) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return !task.completed;
    if (activeFilter === 'completed') return task.completed;
    return task.category === activeFilter;
  });

  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case 'sourcing':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.35)' };
      case 'payment':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.35)' };
      case 'shipping':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.35)' };
      case 'delivery':
        return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.35)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  return (
    <div className="content-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* TOP HEADER & CONTROLS */}
      <div style={{
        background: 'var(--bg-card, rgba(24, 24, 27, 0.75))',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-card, 0 4px 24px -1px rgba(0, 0, 0, 0.45))'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color, #27272a)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
              <ListChecks size={16} />
              <span>Independent Operation Suite</span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', letterSpacing: '-0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckSquare style={{ width: '30px', height: '30px', color: '#3b82f6' }} />
              Sourcing & Order To-Do Checklist
            </h1>
            <p style={{ color: 'var(--text-muted, #a1a1aa)', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
              Independent milestone checklist system for China sourcing pipelines, quality verification, cargo freight, and delivery.
            </p>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Link
              href="/checklist"
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none'
              }}
              title="Open Standalone Full Page Checklist"
            >
              <span>Full Page Mode ↗</span>
            </Link>

            <button
              onClick={handleCopyText}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-surface, #18181b)',
                color: 'var(--text-primary, #f8fafc)',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: '1px solid var(--border-color, #3f3f46)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              title="Copy formatted checklist to clipboard"
            >
              <Copy size={15} style={{ color: '#38bdf8' }} />
              <span>Copy Text</span>
            </button>

            <button
              onClick={handlePrint}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-surface, #18181b)',
                color: 'var(--text-primary, #f8fafc)',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: '1px solid var(--border-color, #3f3f46)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              title="Print checklist"
            >
              <Printer size={15} style={{ color: '#fbbf24' }} />
              <span>Print</span>
            </button>

            <button
              onClick={handleResetChecklist}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-surface, #18181b)',
                color: '#f87171',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              title="Reset checklist to 9 default milestones"
            >
              <RotateCcw size={14} />
              <span>Reset Milestones</span>
            </button>
          </div>
        </div>

        {/* ORDER / PIPELINE SELECTOR */}
        <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--bg-surface, #09090b)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color, #27272a)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
            <FolderOpen size={18} style={{ color: '#60a5fa', flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)', whiteSpace: 'nowrap' }}>
              Checklist Context:
            </span>
            <select
              value={selectedOrderId}
              onChange={(e) => handleSelectOrder(e.target.value)}
              style={{
                flex: 1,
                padding: '7px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-card, #18181b)',
                color: 'var(--text-primary, #ffffff)',
                border: '1px solid var(--border-color, #3f3f46)',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="active">🌟 Active Working Sourcing Pipeline</option>
              {savedOrders.map((ord) => (
                <option key={ord.id} value={ord.id}>
                  📦 {ord.name} ({ord.date}) - {ord.total_items_count} items
                </option>
              ))}
            </select>
          </div>

          {selectedOrderId !== 'active' && onOpenOrderInBuilder && (
            <button
              onClick={() => {
                const found = savedOrders.find((o) => o.id === selectedOrderId);
                if (found) onOpenOrderInBuilder(found);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Open in List Builder</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* PROGRESS OVERVIEW HERO CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem'
      }}>
        {/* Progress Card */}
        <div style={{
          backgroundColor: 'var(--bg-card, #18181b)',
          border: '1px solid var(--border-color, #27272a)',
          borderRadius: '14px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, var(--bg-card, #18181b) 100%)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>
                Pipeline Completion
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: progressPercent === 100 ? '#4ade80' : '#60a5fa' }}>
                {progressPercent}%
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden', marginTop: '10px' }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: progressPercent === 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
          <div style={{ marginTop: '14px', fontSize: '0.8rem', color: 'var(--text-muted, #a1a1aa)' }}>
            {completedCount} of {totalCount} milestones completed
          </div>
        </div>

        {/* Completed Milestones Card */}
        <div style={{
          backgroundColor: 'var(--bg-card, #18181b)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '14px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
            <CheckCircle2 size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 800, textTransform: 'uppercase' }}>Completed Tasks</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>{completedCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #a1a1aa)' }}>Milestones verified</div>
          </div>
        </div>

        {/* Pending Milestones Card */}
        <div style={{
          backgroundColor: 'var(--bg-card, #18181b)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '14px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
            <Clock size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase' }}>Pending Tasks</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>{pendingCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #a1a1aa)' }}>Actions required</div>
          </div>
        </div>
      </div>

      {/* MAIN CHECKLIST INTERACTIVE WORKBENCH */}
      <div style={{
        backgroundColor: 'var(--bg-card, #18181b)',
        border: '1px solid var(--border-color, #27272a)',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.3))'
      }}>
        {/* FILTER TABS & BULK BUTTONS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color, #27272a)' }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #a1a1aa)', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={14} /> Filter:
            </span>
            {(['all', 'pending', 'completed', 'sourcing', 'payment', 'shipping', 'delivery'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'capitalize',
                  backgroundColor: activeFilter === filter ? '#3b82f6' : 'var(--bg-surface, #09090b)',
                  color: activeFilter === filter ? '#ffffff' : 'var(--text-secondary, #d4d4d8)',
                  border: activeFilter === filter ? '1px solid #3b82f6' : '1px solid var(--border-color, #27272a)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Bulk check / uncheck */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleCheckAll}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ✓ Check All
            </button>
            <button
              onClick={handleUncheckAll}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(148, 163, 184, 0.12)',
                color: 'var(--text-muted, #a1a1aa)',
                border: '1px solid var(--border-color, #3f3f46)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Uncheck All
            </button>
          </div>
        </div>

        {/* ADD TASK FORM */}
        <form
          onSubmit={handleAddTask}
          style={{
            marginBottom: '1.25rem',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <input
              type="text"
              required
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="+ Add a new to-do task (e.g. Inspect package weights, Call supplier for tracking ID)..."
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-surface, #09090b)',
                border: '1px solid var(--border-color, #27272a)',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <Plus size={18} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>

          <select
            value={newTaskCategory}
            onChange={(e) => setNewTaskCategory(e.target.value as any)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-surface, #09090b)',
              border: '1px solid var(--border-color, #27272a)',
              color: 'var(--text-primary, #ffffff)',
              fontSize: '0.82rem',
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="sourcing">Sourcing</option>
            <option value="payment">Payment</option>
            <option value="shipping">Shipping</option>
            <option value="delivery">Delivery</option>
            <option value="custom">Custom</option>
          </select>

          <button
            type="submit"
            disabled={!newTaskText.trim()}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              backgroundColor: newTaskText.trim() ? '#2563eb' : '#1e293b',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              border: 'none',
              cursor: newTaskText.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: newTaskText.trim() ? '0 2px 10px rgba(37, 99, 235, 0.35)' : 'none'
            }}
          >
            <Plus size={16} />
            <span>Add Task</span>
          </button>
        </form>

        {/* TASKS LIST */}
        {filteredTasks.length === 0 ? (
          <div style={{
            padding: '3rem 1rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface, #09090b)',
            borderRadius: '12px',
            border: '1px dashed var(--border-color, #27272a)'
          }}>
            <ListChecks size={40} style={{ color: 'var(--text-muted, #52525b)', margin: '0 auto 10px' }} />
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
              No tasks found for this filter
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted, #a1a1aa)' }}>
              Switch filter to "All" or add a new custom task above.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredTasks.map((task, idx) => {
              const catStyle = getCategoryColor(task.category);

              return (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: task.completed ? 'rgba(34, 197, 94, 0.07)' : 'var(--bg-surface, #09090b)',
                    border: task.completed ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-color, #27272a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                    {/* Checkbox */}
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '7px',
                        border: task.completed ? '2px solid #22c55e' : '2px solid #52525b',
                        backgroundColor: task.completed ? '#16a34a' : 'transparent',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {task.completed && <Check size={16} strokeWidth={3} />}
                    </div>

                    {/* Serial index */}
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted, #71717a)', width: '20px', flexShrink: 0 }}>
                      #{idx + 1}
                    </span>

                    {/* Task Title */}
                    <span style={{
                      fontSize: '0.9rem',
                      color: task.completed ? '#86efac' : 'var(--text-primary, #ffffff)',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      fontWeight: task.completed ? 600 : 500,
                      lineHeight: 1.4,
                      flex: 1
                    }}>
                      {task.text}
                    </span>

                    {/* Category Badge */}
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      backgroundColor: catStyle.bg,
                      color: catStyle.text,
                      border: `1px solid ${catStyle.border}`,
                      flexShrink: 0
                    }}>
                      {task.category || 'custom'}
                    </span>
                  </div>

                  {/* Delete Task Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTask(task.id);
                    }}
                    title="Remove task"
                    style={{
                      marginLeft: '12px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted, #71717a)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
