import { redirect } from 'next/navigation';

/**
 * The standalone Payments page has been merged into the Students page
 * under the "Payments" tab. Redirect old bookmarks gracefully.
 */
export default function PaymentsRedirectPage() {
  redirect('/admin/students?tab=payments');
}
