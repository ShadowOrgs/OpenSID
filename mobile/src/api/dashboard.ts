import { apiRequest } from './client';
import type { DashboardResponse } from '@/types/mandiri';

export async function dashboard() {
  return apiRequest<{ data: DashboardResponse }>('/dashboard');
}
