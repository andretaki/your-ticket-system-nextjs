import { redirect } from 'next/navigation';

// This page will immediately redirect users to the dashboard
export default function RootPage() {
  redirect('/dashboard');

  // Note: It's good practice to return null or something minimal
  // as the redirect happens on the server before rendering.
  return null; 
}
