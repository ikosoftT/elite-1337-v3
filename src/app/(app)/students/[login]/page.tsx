import { notFound } from 'next/navigation';
import { StudentProfile } from '@/components/student-profile';
import { DatasetState } from '@/components/dataset-state';
import { requireStudent } from '@/lib/guard';
import { loadRankingDataset } from '@/lib/dataset';
import { getStudentProfile } from '@/lib/student-overview';
import { withTimeout } from '@/lib/timeout';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Builds a signed-in student profile from shared rankings and one cached 42 user read. */
export default async function StudentPage({ params }: { params: Promise<{ login: string }> }) {
  const viewer = await requireStudent();
  const { login } = await params;
  if (!/^[\w.-]{1,40}$/.test(login)) notFound();
  const state = await loadRankingDataset();
  if (state.status !== 'ready') return <DatasetState status={state.status}/>;
  const wanted = login.toLowerCase();
  const person = [...state.data.students, ...state.data.blackholed].find((student) => !student.anonymous && student.login.toLowerCase() === wanted);
  if (!person) notFound();
  const self = viewer.id === String(person.id);
  const details = await withTimeout(getStudentProfile(String(person.id)).catch(() => null), 4_000, null);
  return <main className="shell sp-profile-page"><StudentProfile dataset={state.data} userId={person.id} details={details} self={self}/></main>;
}
