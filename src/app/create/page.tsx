import { redirect } from 'next/navigation';

export default function CreatePage() {
  // Redirect to the dedicated Create Story form
  redirect('/create-story');
}
