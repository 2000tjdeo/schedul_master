import { create } from 'zustand';
import { supabase } from '../lib/supabase.js';

const useTaskStore = create((set, get) => ({
  tasks: [],
  users: [],
  appointments: [],
  selectedDate: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(),
  toast: null,
  loading: false,
  syncInterval: null,

  // ── Toast ───────────────────────────────────────────────────────────────────
  showToast: (message, type = 'info') => {
    set({ toast: { message, type, id: Date.now() } });
    setTimeout(() => set({ toast: null }), 2400);
  },

  // ── Realtime Sync ────────────────────────────────────────────────────────
  startRealtimeSync: () => {
    // Supabase Realtime subscription으로 실시간 동기화 (폴링 대신)
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        if (payload.table === 'sm_tasks') get().fetchTasks();
        if (payload.table === 'sm_appointments') get().fetchAppointments();
      })
      .subscribe();
    set({ syncInterval: channel });
  },
  
  stopRealtimeSync: () => {
    const { syncInterval } = get();
    if (syncInterval) supabase.removeChannel(syncInterval);
    set({ syncInterval: null });
  },

  // ── Data fetching ────────────────────────────────────────────────────────────
  fetchTasks: async () => {
    set({ loading: true });
    try {
      // 릴레이션 기능을 통해 댓글 개수 파악
      const { data, error } = await supabase
        .from('sm_tasks')
        .select('*, sm_comments(id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      const mapped = (data || []).map(t => {
        t.comment_count = t.sm_comments ? t.sm_comments.length : 0;
        delete t.sm_comments;
        return t;
      });
      
      set({ tasks: mapped });
    } catch (err) {
      console.error('fetchTasks error:', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchUsers: async () => {
    try {
      const { data, error } = await supabase.from('sm_users').select('*');
      if (error) throw error;
      set({ users: data || [] });
    } catch (err) {
      console.error('fetchUsers error:', err);
    }
  },

  fetchAppointments: async () => {
    try {
      const { data, error } = await supabase.from('sm_appointments').select('*');
      if (error) throw error;
      set({ appointments: data || [] });
    } catch (err) { console.error('fetchAppointments error:', err); }
  },

  addAppointment: async (apptData) => {
    const validFields = ['title', 'date', 'start_time', 'end_time', 'color', 'created_by', 'project_id'];
    const payload = {};
    for (const key of validFields) {
      if (apptData[key] !== undefined && apptData[key] !== '') payload[key] = apptData[key];
    }
    try {
      const { data, error } = await supabase.from('sm_appointments').insert([payload]).select().single();
      if (error) throw error;
      set(state => ({ appointments: [...state.appointments, data].sort((a,b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)) }));
      get().showToast('약속이 추가되었습니다.', 'success');
      return data;
    } catch (err) {
      get().showToast('약속 추가에 실패했습니다.', 'error');
      return { error: err.message };
    }
  },

  updateAppointment: async (id, apptData) => {
    const validFields = ['title', 'date', 'start_time', 'end_time', 'color', 'created_by'];
    const payload = {};
    for (const key of validFields) {
      if (apptData[key] !== undefined && apptData[key] !== '') payload[key] = apptData[key];
    }
    try {
      const { data, error } = await supabase.from('sm_appointments').update(payload).eq('id', id).select().single();
      if (error) throw error;
      set(state => ({ appointments: state.appointments.map(a => a.id === id ? data : a) }));
      get().showToast('약속이 수정되었습니다.', 'success');
      return data;
    } catch (err) {
      get().showToast('약속 수정에 실패했습니다.', 'error');
      return { error: err.message };
    }
  },

  deleteAppointment: async (id) => {
    try {
      const { error } = await supabase.from('sm_appointments').delete().eq('id', id);
      if (error) throw error;
      set(state => ({ appointments: state.appointments.filter(a => a.id !== id) }));
      get().showToast('약속이 삭제되었습니다.', 'info');
      return { success: true };
    } catch (err) {
      get().showToast('약속 삭제에 실패했습니다.', 'error');
      return { error: err.message };
    }
  },

  // ── Task CRUD ────────────────────────────────────────────────────────────────
  addTask: async (taskData) => {
    try {
      const clean = { ...taskData };
      Object.keys(clean).forEach(k => {
        if (clean[k] === '' || clean[k] === null) delete clean[k];
      });
      const { data, error } = await supabase.from('sm_tasks').insert([clean]).select().single();
      if (error) throw error;
      data.comment_count = 0;
      set(state => ({ tasks: [data, ...state.tasks] }));
      get().showToast('작업이 추가되었습니다.', 'success');
      return data;
    } catch (err) {
      console.error('addTask error:', err);
      get().showToast('작업 추가에 실패했습니다.', 'error');
      return { error: err.message };
    }
  },

  updateTask: async (id, taskData) => {
    try {
      const clean = { ...taskData };
      Object.keys(clean).forEach(k => {
        if (clean[k] === '' || clean[k] === null) delete clean[k];
      });
      const { data, error } = await supabase.from('sm_tasks').update(clean).eq('id', id).select().single();
      if (error) throw error;
      
      set(state => ({
        tasks: state.tasks.map(t => {
          if(t.id === id) {
            data.comment_count = t.comment_count; // Preserve locally tracked count
            return data;
          }
          return t;
        }),
      }));
      get().showToast('작업이 수정되었습니다.', 'success');
      return data;
    } catch (err) {
      console.error('updateTask error:', err);
      get().showToast('작업 수정에 실패했습니다.', 'error');
      return { error: err.message };
    }
  },

  deleteTask: async (id) => {
    try {
      const { error } = await supabase.from('sm_tasks').delete().eq('id', id);
      if (error) throw error;
      set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));
      get().showToast('작업이 삭제되었습니다.', 'info');
      return { success: true };
    } catch (err) {
      console.error('deleteTask error:', err);
      get().showToast('작업 삭제에 실패했습니다.', 'error');
      return { error: err.message };
    }
  },

  moveTask: async (id, newStatus) => {
    return get().updateTask(id, { status: newStatus });
  },

  setSelectedDate: (date) => set({ selectedDate: date }),

  // ── Comments ─────────────────────────────────────────────────────────────────
  getComments: async (taskId) => {
    try {
      const { data, error } = await supabase.from('sm_comments').select('*').eq('task_id', taskId).order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  },

  addComment: async (taskId, commentData) => {
    try {
      // API expects task_id to be stored. Local param may omit it.
      const payload = { ...commentData, task_id: taskId };
      const { data, error } = await supabase.from('sm_comments').insert([payload]).select().single();
      if (error) throw error;
      // Bump comment count locally
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? { ...t, comment_count: (t.comment_count || 0) + 1 } : t
        ),
      }));
      return data;
    } catch (err) {
      return { error: err.message };
    }
  },

  // ── Users ────────────────────────────────────────────────────────────────────
  createUser: async (name) => {
    try {
      const { data, error } = await supabase.from('sm_users').insert([{ name }]).select().single();
      if (error) throw error;
      set(state => ({ users: [...state.users, data] }));
      return data;
    } catch (err) {
      return { error: err.message };
    }
  },
}));

export default useTaskStore;
