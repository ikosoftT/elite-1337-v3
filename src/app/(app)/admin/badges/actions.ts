'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { customBadgeLabelSchema, removeCustomBadge, setCustomBadge } from '@/lib/custom-badges';
import { requireStudent } from '@/lib/guard';
import { isAccessAdmin } from '@/lib/user-controls';

const loginSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_.-]{2,40}$/);
async function actor() { const user = await requireStudent(); if (!await isAccessAdmin(user.login)) throw new Error('Not authorized'); return user.login!.toLowerCase(); }

/** Assigns a validated persistent Redis badge after rechecking admin authority. */
export async function saveCustomBadge(form: FormData) {
  const by = await actor(), login = loginSchema.safeParse(form.get('login')), label = customBadgeLabelSchema.safeParse(form.get('label'));
  if (!login.success || !label.success) redirect('/admin/badges?result=invalid');
  const saved = await setCustomBadge(login.data, label.data, by);
  redirect(`/admin/badges?result=${saved ? 'saved' : 'unavailable'}`);
}

/** Removes one Redis badge assignment after rechecking admin authority. */
export async function deleteCustomBadge(form: FormData) {
  await actor();
  const login = loginSchema.safeParse(form.get('login'));
  if (!login.success) redirect('/admin/badges?result=invalid');
  const removed = await removeCustomBadge(login.data);
  redirect(`/admin/badges?result=${removed ? 'removed' : 'unavailable'}`);
}
